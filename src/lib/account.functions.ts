import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) {
      throw new Error("delete_failed");
    }
    return { ok: true } as const;
  });

const activeViewSchema = z.object({
  view: z.enum(["creator", "free"]),
});

/**
 * Alterna o modo de visualização do usuário logado entre "creator" e "free".
 * Só aceita "free" quando a conta é um creator pago com perfil gratuito
 * ativado (`free_profile_enabled = true`) ou já é `free_creator`.
 */
export const setActiveProfileView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => activeViewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: readErr } = await supabase
      .from("profiles_public")
      .select("account_type, free_profile_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!profile) throw new Error("profile_not_found");

    if (data.view === "free") {
      const allowed =
        profile.account_type === "free_creator" ||
        (profile.account_type === "creator" && profile.free_profile_enabled === true);
      if (!allowed) throw new Error("free_profile_not_enabled");
    }

    // Resolve o creator_profile correspondente ao modo escolhido
    const targetKind = data.view === "free" ? "free" : "paid";
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", targetKind)
      .maybeSingle();

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        active_view: data.view,
        active_profile_id: cp?.id ?? null,
      })
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);


    return { ok: true, view: data.view } as const;
  });
