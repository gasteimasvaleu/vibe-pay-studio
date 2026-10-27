import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, HelpCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsPanel } from "@/components/creator-hub/NotificationsPanel";
import { DestaquesPanel } from "@/components/creator-hub/DestaquesPanel";
import {
  CreatorHubTour,
  useCreatorHubTourAutoOpen,
} from "@/components/creator-hub/CreatorHubTour";
import { isCreatorLike, type AccountType } from "@/lib/auth";

const LOGO_URL =
  "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisexy3..png";

export const Route = createFileRoute("/_authenticated/creator-hub")({
  head: () => ({
    meta: [
      { title: "Creator Hub · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles_public" as any)
      .select("account_type, active_profile_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const accountType = (profile?.account_type ?? "subscriber") as AccountType;
    if (!isCreatorLike(accountType)) throw redirect({ to: "/dashboard" });

    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("id, username, display_name, avatar_url")
      .eq("user_id", user.id);
    const rows = (cp ?? []) as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>;
    const active =
      rows.find((r) => r.id === profile?.active_profile_id) ?? rows[0] ?? null;
    return {
      hubUsername: active?.username ?? "creator",
      hubDisplayName: active?.display_name ?? active?.username ?? "Creator",
      hubAvatarUrl: active?.avatar_url ?? null,
    };
  },
  component: CreatorHubPage,
});

type Tab = "notif" | "destaques" | "pergunte";

function CreatorHubPage() {
  const { hubDisplayName, hubAvatarUrl } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("notif");
  const [tourOpen, setTourOpen] = useCreatorHubTourAutoOpen();
  const qc = useQueryClient();
  const router = useRouter();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["creator-hub-notifications"] });
    qc.invalidateQueries({ queryKey: ["creator-hub-highlights"] });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-card">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-accent"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-2">
            {hubAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hubAvatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <img src={LOGO_URL} alt="" className="h-8 w-8 rounded-full" />
            )}
            <h1 className="text-lg font-black tracking-tight">{hubDisplayName}</h1>
          </div>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-accent"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={refresh}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-accent"
            aria-label="Atualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-4 md:px-6">
          <div className="mx-auto flex w-full max-w-md items-center rounded-full bg-muted p-1">
            <TabPill
              active={tab === "notif"}
              onClick={() => setTab("notif")}
              label="Notificações"
            />
            <TabPill
              active={tab === "destaques"}
              onClick={() => setTab("destaques")}
              label="Destaques"
            />
            <TabPill
              active={false}
              disabled
              onClick={() => {}}
              label="Pergunte"
              badge="em breve"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        {tab === "notif" && <NotificationsPanel />}
        {tab === "destaques" && <DestaquesPanel />}
      </main>

      <CreatorHubTour open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  );
}

function TabPill({
  active,
  onClick,
  label,
  disabled,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : disabled
            ? "text-muted-foreground opacity-70"
            : "text-foreground/80 hover:bg-background/60"
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}
