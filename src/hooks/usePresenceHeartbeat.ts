import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { touchPresence } from "@/lib/presence.functions";

/**
 * Global presence heartbeat. Mounts once in the authenticated layout so that
 * whenever a user has ANY authenticated page open, they are broadcast as
 * online through the `online-users` Supabase channel AND their
 * `profiles.last_seen_at` is bumped every 60s.
 */
export function usePresenceHeartbeat() {
  const touch = useServerFn(touchPresence);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let currentUserId: string | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      currentUserId = uid;

      channel = supabase.channel("online-users", {
        config: { presence: { key: uid } },
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

    let cleanupExtras: (() => void) | null = null;
    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (cleanupExtras) cleanupExtras();
      if (channel) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
      void currentUserId;
    };
  }, [touch]);
}
