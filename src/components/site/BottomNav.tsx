import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Plus, Search, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["bottom-nav-account-type"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { account_type: "subscriber", active_view: "creator", free_profile_enabled: false } as const;
      }
      const { data } = await supabase
        .from("profiles")
        .select("account_type, active_view, free_profile_enabled")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return {
        account_type: (data?.account_type ?? "subscriber") as
          | "subscriber"
          | "creator"
          | "free_creator",
        active_view: (data?.active_view ?? "creator") as "creator" | "free",
        free_profile_enabled: data?.free_profile_enabled === true,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const accountType = profile?.account_type ?? "subscriber";
  // Todo tipo de creator (pago, gratuito puro, ou pago em modo free) tem o
  // layout com "Postar". Só `subscriber` puro vê o layout de assinante.
  const isSubscriber = accountType === "subscriber";


  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className={`max-w-3xl mx-auto px-4 h-16 grid items-center ${
          isSubscriber ? "grid-cols-4" : "grid-cols-5"
        }`}
      >
        <NavItem
          to="/feed"
          active={pathname === "/feed"}
          icon={<Smartphone className="h-5 w-5" />}
          label="Feed"
        />
        <NavItem
          icon={<TrendingUp className="h-5 w-5" />}
          label="Em alta"
        />
        {!isSubscriber && <CenterPost />}
        <NavItem
          to="/chat"
          active={pathname.startsWith("/chat")}
          icon={<MessageCircle className="h-5 w-5" />}
          label="Chat"
        />
        {isSubscriber ? (
          <NavItem
            to="/search"
            active={pathname.startsWith("/search")}
            icon={<Search className="h-5 w-5" />}
            label="Busca"
          />
        ) : (
          <NavItem
            to="/creator-hub"
            active={pathname.startsWith("/creator-hub")}
            icon={<Sparkles className="h-5 w-5" />}
            label="Fadinha"
          />
        )}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  active,
  icon,
  label,
}: {
  to?: string;
  active?: boolean;
  icon: ReactNode;
  label: string;
}) {
  const classes = `flex flex-col items-center justify-center gap-1 h-full transition-colors ${
    active ? "text-white" : "text-white/60 hover:text-white/90"
  }`;
  const content = (
    <>
      {icon}
      <span className="text-[11px] font-medium leading-none truncate max-w-[72px]">
        {label}
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes}>
      {content}
    </button>
  );
}

function CenterPost() {
  return (
    <Link
      to="/publisher"
      className="flex flex-col items-center justify-center gap-1 h-full text-white/80 hover:text-white transition-colors"
      aria-label="Postar"
    >
      <span className="h-12 w-12 -mt-6 grid place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/40 ring-4 ring-black/70">
        <Plus className="h-6 w-6 text-white" />
      </span>
      <span className="text-[11px] font-medium leading-none -mt-1">Postar</span>
    </Link>
  );
}
