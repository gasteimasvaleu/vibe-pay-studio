import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { getAuthErrorMessage, routeAfterAuth, signInWithEmail, signInWithGoogle } from "@/lib/auth";

const searchSchema = z.object({
  email: z.string().email().optional(),
  confirmado: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/entrar")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar · Monetisexy" },
      { name: "description", content: "Acesse sua conta Monetisexy." },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      await routeAfterAuth(navigate);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? getAuthErrorMessage(err.message)
          : "Erro ao entrar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate({ to: "/" });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? getAuthErrorMessage(err.message)
          : "Erro ao entrar com Google.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-5xl">
          <Link to="/" className="block text-center mb-8">
            <span className="text-2xl font-black tracking-tight">
              moneti<span className="text-gradient-primary">sexy.</span>
            </span>
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="rounded-3xl border border-border bg-surface p-8 md:p-10">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Entrar</h1>
              <p className="mt-2 text-sm text-muted-foreground">Bem-vindo de volta.</p>
              {search.confirmado && (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
                >
                  E-mail confirmado! Faça login para continuar.
                </p>
              )}

              <form onSubmit={onSubmit} className="mt-8 space-y-4">
                <Field
                  label="E-mail"
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Field
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="text-right">
                  <a href="#" className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </a>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-md bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
                {errorMsg && (
                  <p role="alert" className="text-sm text-red-500">
                    {errorMsg}
                  </p>
                )}
              </form>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs label-caps text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogle}
                  className="w-full py-3 rounded-md border border-border hover:border-foreground bg-background font-medium text-sm transition-colors disabled:opacity-60"
                >
                  {googleLoading ? "Redirecionando..." : "Continuar com Google"}
                </button>
              </div>
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                  Cadastre-se
                </Link>
              </p>
            </div>

            <div className="hidden md:flex rounded-3xl border border-border bg-surface overflow-hidden h-full flex-col">
              <div className="relative flex-1 min-h-0">
                <video
                  src="https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/02178465912133300000000000000000000ffffc0a8b2417262a0.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
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
