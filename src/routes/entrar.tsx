import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar · Monetisex" },
      { name: "description", content: "Acesse sua conta Monetisex." },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const [loading, setLoading] = useState(false);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="block text-center mb-8">
            <span className="text-2xl font-black tracking-tight">
              monet<span className="text-gradient-primary">isex</span>
            </span>
          </Link>
          <div className="rounded-3xl border border-border bg-surface p-8 md:p-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Entrar</h1>
            <p className="mt-2 text-sm text-muted-foreground">Bem-vindo de volta.</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Field label="E-mail ou usuário" type="text" placeholder="voce@email.com" />
              <Field label="Senha" type="password" placeholder="••••••••" />
              <div className="text-right">
                <a href="#" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs label-caps text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-3">
              <button className="w-full py-3 rounded-full border border-border hover:border-foreground bg-background font-medium text-sm transition-colors">
                Continuar com Google
              </button>
              <button className="w-full py-3 rounded-full border border-border hover:border-foreground bg-background font-medium text-sm transition-colors">
                Continuar com Apple
              </button>
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <a href="#" className="hover:text-foreground">Termos</a> · <a href="#" className="hover:text-foreground">Privacidade</a> · <a href="#" className="hover:text-foreground">Ajuda</a>
      </footer>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs label-caps text-muted-foreground mb-2">{label}</label>
      <input
        {...rest}
        required
        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-colors text-sm"
      />
    </div>
  );
}
