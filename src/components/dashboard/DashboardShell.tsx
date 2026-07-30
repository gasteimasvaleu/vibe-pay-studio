import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowLeftRight, Loader2 } from "lucide-react";
import { ProfileHeaderCard } from "./ProfileHeaderCard";

export type SwitchBar = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  avatarUrl?: string | null;
};

export function DashboardShell({
  username,
  isCreator,
  showProfileLink,
  avatarUrl,
  switchBar,
  children,
  verified = false,
}: {
  username: string;
  isCreator: boolean;
  verified?: boolean;
  showProfileLink?: boolean;
  avatarUrl?: string | null;
  switchBar?: SwitchBar;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-white" />

      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Meu painel
          </h1>
          <Link
            to="/feed"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3"
          >
            Feed
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <ProfileHeaderCard
          username={username}
          isCreator={isCreator}
          verified={verified}
          showProfileLink={showProfileLink}
          avatarUrl={avatarUrl}
          footer={
            switchBar ? (
              <div className="mx-5 mb-5 rounded-2xl border bg-white shadow-sm p-1.5">
                <button
                  type="button"
                  onClick={switchBar.onClick}
                  disabled={switchBar.loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-accent/50 active:scale-[0.99] transition-all text-left disabled:opacity-70"
                >
                  <span className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center shrink-0 overflow-hidden">
                    {switchBar.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : switchBar.avatarUrl ? (
                      <img
                        src={switchBar.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-primary text-sm font-bold">P</span>
                    )}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {switchBar.label}
                  </span>
                  <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />
                </button>
              </div>
            ) : null
          }
        />
        {children}
      </main>
    </div>
  );
}

export function DashboardGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
