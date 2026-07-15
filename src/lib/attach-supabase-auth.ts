import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Project-specific replacement for the generated `attachSupabaseAuth`.
// - Waits for `getUser()` so a pending refresh has time to complete.
// - Redirects to /entrar when there's no session, instead of firing an
//   unauthenticated RPC that would blank the screen with a 401.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // getUser() triggers a refresh if the access token is stale.
    await supabase.auth.getUser().catch(() => null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw redirect({ to: "/entrar" });
    }
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
