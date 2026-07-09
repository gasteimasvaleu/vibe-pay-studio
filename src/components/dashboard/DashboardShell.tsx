import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProfileHeaderCard } from "./ProfileHeaderCard";

export function DashboardShell({
  username,
  isCreator,
  children,
}: {
  username: string;
  isCreator: boolean;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: "var(--gradient-radial)" }}
      />

      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
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
        <ProfileHeaderCard username={username} isCreator={isCreator} />
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
