import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { avatarUrl: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const url = data.avatarUrl.trim();
    if (!url) throw new Error("url inválida");
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { avatarUrl: url };
  });
