import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Plus, Smartphone, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-3xl mx-auto px-4 h-16 grid grid-cols-5 items-center">
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
        <CenterPost />
        <NavItem
          icon={<MessageCircle className="h-5 w-5" />}
          label="Chat"
        />
        <NavItem
          icon={<Wallet className="h-5 w-5" />}
          label="Minha carteira"
        />
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
