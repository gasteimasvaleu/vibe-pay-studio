import { useEffect, useSyncExternalStore } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { touchPresence } from "@/lib/presence.functions";

// -----------------------------------------------------------------------------
// Shared online-users store. The Supabase realtime client dedupes channels by
// topic name, so only ONE consumer can call `channel("online-users").subscribe()`
// per tab. `usePresenceHeartbeat` owns that channel and publishes the presence
// state to a small module-level store; every other component reads via
// `useOnlineUsers()` instead of opening a second channel (which would throw
// "cannot add presence callbacks for realtime:online-users after subscribe()").
// -----------------------------------------------------------------------------

let onlineUsers: Set<string> = new Set();
const listeners = new Set<() => void>();

function setOnlineUsers(next: Set<string>) {
  onlineUsers = next;
  listeners.forEach((l) => l());
}

function subscribeOnlineUsers(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getOnlineUsersSnapshot() {
  return onlineUsers;
}

export function useOnlineUsers(): Set<string> {
  return useSyncExternalStore(
    subscribeOnlineUsers,
    getOnlineUsersSnapshot,
    getOnlineUsersSnapshot,
  );
}

/**
 * Global presence heartbeat. Mounts once in the authenticated layout so that
 * whenever a user has ANY authenticated page open, they are broadcast as
 * online through the `online-users` Supabase channel AND their
 * `profiles.last_seen_at` is bumped every 60s. Also publishes the current set
 * of online user ids via {@link useOnlineUsers}.
 */
export function usePresenceHeartbeat() {
  const touch = useServerFn(touchPresence);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let currentUserId: string | null = null;
    let cleanupExtras: (() => void) | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      currentUserId = uid;

      channel = supabase.channel("online-users", {
        config: { presence: { key: uid } },
      });

      // Register presence listeners BEFORE subscribe(). Supabase throws if
      // callbacks are added after subscribe(), and since channels are shared
      // by topic name this listener is the single source of truth for the app.
      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && channel) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

      const ping = () => {
        touch({}).catch(() => {});
      };
      ping();
      interval = setInterval(ping, 60_000);

      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          ping();
          if (channel) {
            channel.track({ online_at: new Date().toISOString() }).catch(() => {});
          }
        } else if (channel) {
          channel.untrack().catch(() => {});
        }
      };
      const onPageHide = () => {
        if (channel) channel.untrack().catch(() => {});
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", onPageHide);

      cleanupExtras = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", onPageHide);
      };
    };

    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (cleanupExtras) cleanupExtras();
      if (channel) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
      setOnlineUsers(new Set());
      void currentUserId;
    };
  }, [touch]);
}
