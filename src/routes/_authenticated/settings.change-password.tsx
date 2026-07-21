import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/change-password")({
  head: () => ({
    meta: [
      { title: "Alterar Senha · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    return { email: user.email ?? "" };
  },
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const router = useRouter();
  const { email } = Route.useRouteContext();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPasswordProvider, setHasPasswordProvider] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const identities = data.user?.identities ?? [];
      setHasPasswordProvider(identities.some((i) => i.provider === "email"));
    })();
    return () => {
      active = false;
    };
  }, []);

  const rules = useMemo(
    () => ({
      length: next.length >= 8,
      number: /\d/.test(next),
      case: /[a-z]/.test(next) && /[A-Z]/.test(next),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(next),
    }),
    [next],
  );
  const passwordValid = Object.values(rules).every(Boolean);
  const sameAsCurrent = next.length > 0 && next === current;

  const canSubmit =
    current.length > 0 &&
    passwordValid &&
    confirm === next &&
    !sameAsCurrent &&
    !loading;

  const canCancel =
    !loading && (current.length > 0 || next.length > 0 || confirm.length > 0);

  const handleSave = async () => {
    if (!canSubmit || !email) return;
    if (sameAsCurrent) {
      toast.error("A nova senha deve ser diferente da atual.");
      return;
    }
    setLoading(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (reauthError) {
        toast.error("Senha atual incorreta");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Senha alterada");
      setCurrent("");
      setNext("");
      setConfirm("");
      router.history.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível alterar a senha";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
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
            Alterar Senha
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        {hasPasswordProvider === null ? (
          <div className="rounded-2xl bg-muted h-14 animate-pulse" />
        ) : hasPasswordProvider === false ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted grid place-items-center">
              <KeyRound className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Alteração de senha indisponível
            </h2>
            <p className="text-sm text-muted-foreground">
              Você entrou com Google. Sua senha é gerenciada pela sua conta Google — altere-a diretamente lá.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.open("https://myaccount.google.com/security", "_blank", "noopener,noreferrer")
              }
            >
              Abrir conta Google
            </Button>
          </div>
        ) : (
          <>
            <PasswordField
              value={current}
              onChange={setCurrent}
              placeholder="Senha atual"
              autoComplete="current-password"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PasswordField
                value={next}
                onChange={setNext}
                placeholder="Nova Senha"
                autoComplete="new-password"
              />
              <PasswordField
                value={confirm}
                onChange={setConfirm}
                placeholder="Repetir a nova senha"
                autoComplete="new-password"
              />
            </div>

            {sameAsCurrent && (
              <p className="text-xs text-destructive pl-1">
                A nova senha deve ser diferente da atual.
              </p>
            )}

            <PasswordRules rules={rules} />

            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Salvando…" : "Salvar"}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                disabled={!canCancel}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Cancelar
              </Button>
            </div>
          </>
        )}
      </main>

    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block rounded-2xl bg-muted px-5 py-3">
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="border-0 bg-transparent p-0 h-auto text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
      />
    </label>
  );
}

function PasswordRules({ rules }: { rules: Record<string, boolean> }) {
  const items = [
    { key: "length", label: "Mínimo de 8 caracteres." },
    { key: "number", label: "Incluir pelo menos um número." },
    { key: "case", label: "Incluir pelo menos uma letra minúscula e uma maiúscula." },
    { key: "special", label: "Incluir pelo menos um caractere especial (ex: !@#$%^&*)." },
  ];
  return (
    <ul className="space-y-1.5 pt-1">
      {items.map((i) => {
        const ok = rules[i.key];
        return (
          <li key={i.key} className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center justify-center w-4 h-4 rounded-md transition-colors ${
                ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            <span className={ok ? "text-foreground" : "text-muted-foreground"}>{i.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
