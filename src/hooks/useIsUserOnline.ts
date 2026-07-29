import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Read-only subscription to the global `online-users` presence channel.
 * Returns true if the given userId currently has an active presence.
 */
export function useIsUserOnline(userId: string | null | undefined): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOnline(false);
      return;
    }
    const channel = supabase.channel("online-users-reader-" + userId);
    // Join the same room to receive presence sync events. We do NOT track
    // ourselves here — tracking is handled globally by usePresenceHeartbeat.
    channel
      .on("presence", { event: "sync" }, () => {
        // Presence state is keyed by userId (see usePresenceHeartbeat).
        // Read from the shared `online-users` channel via presenceState of
        // a peer channel is not possible; instead, subscribe to the same
        // channel name that peers track on.
      })
      .subscribe();

    // Use a second channel bound to the same room name as writers to read
    // presence keys from all peers.
    const shared = supabase.channel("online-users");
    shared
      .on("presence", { event: "sync" }, () => {
        const state = shared.presenceState();
        setOnline(Boolean(state[userId] && state[userId].length > 0));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(shared);
    };
  }, [userId]);

  return online;
}
