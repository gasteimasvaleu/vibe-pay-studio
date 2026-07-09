import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck } from "lucide-react";

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
  const displayName = username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold truncate">Meu painel</h1>
          <Link
            to="/feed"
            className="text-xs text-white/60 hover:text-white transition-colors px-3"
          >
            Feed
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-2xl font-black shadow-xl shadow-purple-900/40">
            {username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight truncate">
                {displayName}
              </h2>
              {isCreator && (
                <BadgeCheck className="h-5 w-5 text-fuchsia-400 fill-fuchsia-400/20" />
              )}
            </div>
            <p className="text-sm text-white/60">@{username}</p>
            <Link
              to="/perfil/$username"
              params={{ username }}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition-colors"
            >
              Ver perfil público →
            </Link>
          </div>
        </motion.section>

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
      <h4 className="text-xs uppercase tracking-wider text-white/40 font-semibold">
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
