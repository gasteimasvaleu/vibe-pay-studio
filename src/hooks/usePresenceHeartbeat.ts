import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { touchPresence } from "@/lib/presence.functions";
import { getMyStatus } from "@/lib/user-status.functions";

// -----------------------------------------------------------------------------
// Shared online-users store. The Supabase realtime client dedupes channels by
// topic name, so only ONE consumer can call `channel("online-users").subscribe()`
// per tab. `usePresenceHeartbeat` owns that channel and publishes the presence
// state to a small module-level store; every other component reads via
// `useOnlineUsers()` instead of opening a second channel.
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
 * Global presence heartbeat. Mounted once by the authenticated layout.
 *
 * Behavior depends on the user's saved status in `user_status`:
 *  - `online` / `in_chat`: bump `profiles.last_seen_at` every 60s AND
 *    broadcast presence through the `online-users` realtime channel.
 *  - `offline`: skip both. To others, the user's green dot disappears from
 *    the chat list and the "Online hoje" badge stops matching.
 *
 * Also handles the `clear_after_at` auto-reset: schedules a timer that
 * refetches the status once the window expires, so the server-side reset in
 * `getMyStatus` runs and the client picks the new value up.
 */
export function usePresenceHeartbeat() {
  const touch = useServerFn(touchPresence);
  const getMyStatusFn = useServerFn(getMyStatus);
  const queryClient = useQueryClient();

  const { data: statusRow } = useQuery({
    queryKey: ["user-status", "me"],
    queryFn: () => getMyStatusFn(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const status = statusRow?.status ?? "online";
  const clearAfterAt = statusRow?.clearAfterAt ?? null;

  // Auto-reset timer: when the "clear after" moment arrives, refetch and let
  // the server reset the row to `online`.
  useEffect(() => {
    if (!clearAfterAt) return;
    const ms = new Date(clearAfterAt).getTime() - Date.now();
    if (ms <= 0) {
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
      return;
    }
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
    }, Math.min(ms, 2_147_483_000));
    return () => clearTimeout(t);
  }, [clearAfterAt, queryClient]);

  useEffect(() => {
    // Offline: make sure we are not broadcasting or writing last_seen_at.
    if (status === "offline") {
      setOnlineUsers(new Set());
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cleanupExtras: (() => void) | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;

      channel = supabase.channel("online-users", {
        config: { presence: { key: uid } },
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      });

      channel.subscribe(async (s) => {
        if (s === "SUBSCRIBED" && channel) {
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
    };
  }, [touch, status]);
}
