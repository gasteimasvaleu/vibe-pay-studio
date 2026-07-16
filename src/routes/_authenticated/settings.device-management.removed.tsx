import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Info, Laptop, Smartphone, Tablet } from "lucide-react";
import {
  listMyRevokedSessions,
  type RevokedSession,
} from "@/lib/sessions.functions";
import { parseUA, formatDate } from "@/lib/session-format";

export const Route = createFileRoute(
  "/_authenticated/settings/device-management/removed",
)({
  head: () => ({
    meta: [
      { title: "Acessos removidos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: () => listMyRevokedSessions(),
  component: RemovedDevicesPage,
});

function RemovedDevicesPage() {
  const router = useRouter();
  const revoked = Route.useLoaderData() as RevokedSession[];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Acessos removidos
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        {revoked.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              Nenhum acesso removido até agora. Assim que houver, você verá o
              histórico aqui.
            </p>
          </div>
        ) : (
          revoked.map((r) => <RevokedCard key={r.id} item={r} />)
        )}
      </main>
    </div>
  );
}

function RevokedCard({ item }: { item: RevokedSession }) {
  const ua = parseUA(item.userAgent);
  const Icon =
    ua.kind === "mobile" ? Smartphone : ua.kind === "tablet" ? Tablet : Laptop;
  const badge =
    item.reason === "user_all" ? "Removido em massa" : "Você removeu";
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="h-10 w-10 grid place-items-center text-muted-foreground shrink-0">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-foreground">
          {ua.browser} · {ua.os}
        </p>
        <p className="text-sm text-foreground">
          Removido em {formatDate(item.revokedAt)}
        </p>
        <p className="text-sm text-muted-foreground">
          Entrou em {formatDate(item.sessionCreatedAt)}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {item.ip ?? "IP indisponível"}
        </p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
        {badge}
      </span>
    </div>
  );
}
