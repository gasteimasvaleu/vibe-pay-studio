import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { sanitizeUsername, USERNAME_MIN, USERNAME_MAX } from "@/lib/utils";
import {
  getAuthErrorMessage,
  routeAfterAuth,
  signInWithGoogle,
  signUpWithEmail,
  type AccountType,
} from "@/lib/auth";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta · Monetisexy" },
      { name: "description", content: "Crie sua conta grátis na Monetisexy e comece a monetizar seu conteúdo." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("subscriber");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rules = useMemo(
    () => ({
      length: password.length >= 8,
      number: /\d/.test(password),
      case: /[a-z]/.test(password) && /[A-Z]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    }),
    [password]
  );

  const usernameValid = username.length >= USERNAME_MIN;
  const passwordValid = Object.values(rules).every(Boolean);
  const canSubmit = usernameValid && passwordValid && email.includes("@") && agreed;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await signUpWithEmail({ accountType, email, password, username });

      if (data.session) {
        await routeAfterAuth(navigate);
        return;
      }

      navigate({ to: "/cadastro/confirme-email", search: { email } });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? getAuthErrorMessage(err.message)
          : "Erro ao criar conta. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle({ accountType, username: username || undefined });
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

  const copy =
    accountType === "subscriber"
      ? "Crie sua conta e tenha acesso a conteúdos exclusivos dos seus criadores favoritos!"
      : "Publique, se relacione com sua comunidade e comece a faturar.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="block text-center mb-8">
            <span className="text-2xl font-black tracking-tight">
              monet<span className="text-gradient-primary">isex</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-border bg-surface p-6 md:p-10">
            <AccountTypeTabs value={accountType} onChange={setAccountType} />

            <h1 className="mt-8 text-2xl md:text-3xl font-black tracking-tight">Crie sua conta</h1>
            <p className="mt-2 text-sm text-muted-foreground">{copy}</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Field
                label="Nome de usuário"
                type="text"
                placeholder="seunome"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                minLength={USERNAME_MIN}
                maxLength={USERNAME_MAX}
                hint={`${username.length}/${USERNAME_MAX} — letras, números e _`}
              />
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

              <PasswordRules rules={rules} />

              <label className="flex items-start gap-3 text-sm text-muted-foreground pt-2">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span>
                  Ao se cadastrar na Monetisexy, você atesta que leu e concorda com nossos{" "}
                  <a href="#" className="text-primary hover:underline">Termos</a> e{" "}
                  <a href="#" className="text-primary hover:underline">Privacidade</a> e confirma que tem pelo menos 18 anos de idade.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full py-3 rounded-md bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Criando..." : "Confirmar"}
              </button>

              {errorMsg && (
                <p role="alert" className="text-sm text-red-500">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p role="status" className="text-sm text-primary">
                  {successMsg}
                </p>
              )}
            </form>

            <Divider />

            <div className="space-y-3">
              <SocialButton
                label={googleLoading ? "Redirecionando..." : "Continuar com Google"}
                disabled={googleLoading}
                onClick={handleGoogle}
              />
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
        <a href="#" className="hover:text-foreground">Termos</a> ·{" "}
        <a href="#" className="hover:text-foreground">Privacidade</a> ·{" "}
        <a href="#" className="hover:text-foreground">Ajuda</a>
      </footer>
    </div>
  );
}

function AccountTypeTabs({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (v: AccountType) => void;
}) {
  const tabs: { id: AccountType; label: string }[] = [
    { id: "subscriber", label: "Seja assinante" },
    { id: "creator", label: "Seja creator" },
  ];
  return (
    <div className="grid grid-cols-2 p-1 rounded-md border border-border bg-background">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`py-2.5 text-sm font-semibold rounded-md transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
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

function Field({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs label-caps text-muted-foreground mb-2">{label}</label>
      <input
        {...rest}
        required
        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-colors text-sm"
      />
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
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

function SocialButton({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full py-3 rounded-md border border-border hover:border-foreground bg-background font-medium text-sm transition-colors disabled:opacity-60"
    >
      {label}
    </button>
  );
}
