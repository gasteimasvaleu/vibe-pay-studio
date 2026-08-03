import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Project-specific replacement for the generated `attachSupabaseAuth`.
// - Waits for `getUser()` so a pending refresh has time to complete.
// - Anexa o token quando há sessão; funções públicas continuam acessíveis
//   sem token e funções protegidas fazem a própria validação no servidor.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // getUser() triggers a refresh if the access token is stale.
    await supabase.auth.getUser().catch(() => null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
