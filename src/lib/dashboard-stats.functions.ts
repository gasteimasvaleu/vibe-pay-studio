import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

export const getActiveProfileViewCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const creatorProfileId = await getActiveProfileIdFor(supabase, userId);
    if (!creatorProfileId) return { count: 0 };

    const { count, error } = await supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("creator_profile_id", creatorProfileId);

    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
