import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const touchPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: true };
  });

export const getLastSeen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ lastSeenAt: string | null }> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("profiles_public" as any)
      .select("last_seen_at")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { lastSeenAt: (row?.last_seen_at as string | null) ?? null };
  });
