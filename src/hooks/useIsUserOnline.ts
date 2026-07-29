import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true when the target user's `profiles.last_seen_at` is within the
 * last 90 seconds. Uses polling instead of a Realtime presence reader — the
 * shared `online-users` presence channel is a singleton owned by
 * `usePresenceHeartbeat`, and attaching another `.on("presence", ...)` after
 * its `subscribe()` throws "cannot add `presence` callbacks after
 * `subscribe()`".
 */
export function useIsUserOnline(userId: string | null | undefined): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOnline(false);
      return;
    }

    let cancelled = false;

    async function check() {
      const { data } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (cancelled) return;
      const iso = (data as { last_seen_at?: string | null } | null)?.last_seen_at;
      if (!iso) {
        setOnline(false);
        return;
      }
      const diffMs = Date.now() - new Date(iso).getTime();
      setOnline(diffMs < 90_000);
    }

    check();
    const timer = setInterval(check, 30_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId]);

  return online;
}
