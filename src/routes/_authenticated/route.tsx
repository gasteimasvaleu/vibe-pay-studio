import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/site/BottomNav";
import { TopNav } from "@/components/site/TopNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/entrar" });
    }
    return { user: data.user };
  },
  component: () => (
    <div className="pb-24">
      <TopNav />
      <Outlet />
      <BottomNav />
    </div>
  ),
});
