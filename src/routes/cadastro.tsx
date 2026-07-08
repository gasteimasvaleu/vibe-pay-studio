import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta · Monetize" },
      { name: "description", content: "Crie sua conta grátis na Monetize e comece a monetizar seu conteúdo." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
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
              monet<span className="text-gradient-primary">ize</span>
            </span>
          </Link>
          <div className="rounded-3xl border border-border bg-surface p-8 md:p-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Crie sua conta grátis</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sem cartão de crédito. Cadastro em 2 minutos.
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Field label="Nome de usuário" type="text" placeholder="@seuusuario" />
              <Field label="E-mail" type="email" placeholder="voce@email.com" />
              <Field label="Senha" type="password" placeholder="••••••••" />
              <Field label="Confirmar senha" type="password" placeholder="••••••••" />
              <label className="flex items-start gap-3 text-sm text-muted-foreground pt-2">
                <input type="checkbox" required className="mt-1 accent-primary" />
                <span>Sou maior de 18 anos e aceito os <a href="#" className="text-primary hover:underline">Termos de Uso</a>.</span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? "Criando..." : "Criar conta"}
              </button>
            </form>
            <Divider />
            <div className="space-y-3">
              <SocialButton label="Continuar com Google" />
              <SocialButton label="Continuar com Apple" />
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/entrar" className="text-primary hover:underline font-semibold">
                Entrar
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

function Divider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs label-caps text-muted-foreground">ou</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SocialButton({ label }: { label: string }) {
  return (
    <button className="w-full py-3 rounded-full border border-border hover:border-foreground bg-background font-medium text-sm transition-colors">
      {label}
    </button>
  );
}
