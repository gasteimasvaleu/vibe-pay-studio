import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true when the target user's `profiles.last_seen_at` is within the
 * last 90 seconds AND they haven't chosen the "offline" status in
 * /account-status. Uses polling instead of a Realtime presence reader — the
 * shared `online-users` presence channel is a singleton owned by
 * `usePresenceHeartbeat`.
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
      const [{ data: profile }, { data: statusRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select("last_seen_at")
          .eq("id", userId as string)
          .maybeSingle(),
        supabase
          .from("user_status")
          .select("status, clear_after_at")
          .eq("user_id", userId as string)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      // Respect explicit "offline" (unless the auto-clear window elapsed).
      const status =
        (statusRow as { status?: string; clear_after_at?: string | null } | null)?.status ?? "online";
      const clearAt =
        (statusRow as { clear_after_at?: string | null } | null)?.clear_after_at ?? null;
      const expired = clearAt ? new Date(clearAt).getTime() <= Date.now() : false;
      if (status === "offline" && !expired) {
        setOnline(false);
        return;
      }

      const iso = (profile as { last_seen_at?: string | null } | null)?.last_seen_at;
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
