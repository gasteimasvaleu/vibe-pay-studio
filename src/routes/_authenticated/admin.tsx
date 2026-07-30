import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { requireAdminAccess } from "@/lib/admin-dashboard.functions";

import { LayoutDashboard, Receipt, Users, ShieldAlert, Banknote, FileWarning, Bug, Mail, RefreshCcw, ScrollText, Radio, Film, Send, Video, CreditCard, Tag, Trophy, LineChart, Settings, MessageSquare, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    try {
      await requireAdminAccess();
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/transactions", label: "Transações", icon: Receipt, exact: false },
  { to: "/admin/finance", label: "Finance", icon: LineChart, exact: false },
  { to: "/admin/users", label: "Usuários", icon: Users, exact: false },
  { to: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard, exact: false },
  { to: "/admin/promotions", label: "Promoções", icon: Tag, exact: false },
  { to: "/admin/withdrawals", label: "Saques", icon: Banknote, exact: false },
  { to: "/admin/refunds", label: "Reembolsos", icon: RefreshCcw, exact: false },
  { to: "/admin/moderation", label: "Moderação", icon: ShieldAlert, exact: false },
  { to: "/admin/verifications", label: "Certificações", icon: BadgeCheck, exact: false },
  { to: "/admin/lives", label: "Lives", icon: Radio, exact: false },
  { to: "/admin/stories", label: "Stories", icon: Film, exact: false },
  { to: "/admin/broadcasts", label: "Broadcasts", icon: Send, exact: false },
  { to: "/admin/videocalls", label: "Videocalls", icon: Video, exact: false },
  { to: "/admin/trophies", label: "Troféus", icon: Trophy, exact: false },
  { to: "/admin/leaks", label: "Vazamentos", icon: FileWarning, exact: false },
  { to: "/admin/bugs", label: "Bugs", icon: Bug, exact: false },
  { to: "/admin/emails", label: "E-mails", icon: Mail, exact: false },
  { to: "/admin/contacts", label: "Contatos", icon: MessageSquare, exact: false },
  { to: "/admin/audit", label: "Auditoria", icon: ScrollText, exact: false },
  { to: "/admin/settings", label: "Ajustes", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-2xl font-semibold">Painel administrativo</h1>
        </div>
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="px-3 py-2 text-sm flex items-center gap-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              activeProps={{
                className:
                  "px-3 py-2 text-sm flex items-center gap-2 border-b-2 border-primary text-foreground font-medium whitespace-nowrap",
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
