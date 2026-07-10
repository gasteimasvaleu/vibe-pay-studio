import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CadastrarBancoForm } from "@/components/banco/CadastrarBancoForm";

export const Route = createFileRoute("/_authenticated/banco/cadastrar")({
  head: () => ({
    meta: [
      { title: "Cadastrar Dados Bancários · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CadastrarBancoPage,
});

function CadastrarBancoPage() {
  const router = useRouter();
  const close = () => router.history.back();

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
            onClick={close}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Cadastrar Dados Bancários
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8">
        <CadastrarBancoForm onClose={close} />
      </main>
    </div>
  );
}
