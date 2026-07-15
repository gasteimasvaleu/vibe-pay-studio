import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Instagram, Music2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { saveSocialLinks } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/creator/onboarding/redes-sociais")({
  head: () => ({
    meta: [
      { title: "Redes Sociais · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedesSociaisPage,
});

const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

function sanitize(v: string) {
  return v.replace(/^@+/, "").trim();
}

function RedesSociaisPage() {
  const navigate = useNavigate();
  const saveFn = useServerFn(saveSocialLinks);
  const [ig, setIg] = useState("");
  const [tt, setTt] = useState("");
  const [x, setX] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (v: string) => v === "" || HANDLE_RE.test(v);

  const handleAdvance = async (skip: boolean) => {
    setError(null);
    const payload = skip
      ? { instagram_handle: null, tiktok_handle: null, x_handle: null }
      : {
          instagram_handle: ig ? sanitize(ig) : null,
          tiktok_handle: tt ? sanitize(tt) : null,
          x_handle: x ? sanitize(x) : null,
        };

    if (!skip) {
      const invalid = Object.values(payload).some(
        (h) => h !== null && !HANDLE_RE.test(h as string),
      );
      if (invalid) {
        setError("Handles inválidos. Use apenas letras, números, ponto e underline.");
        return;
      }
    }

    setSaving(true);
    try {
      await saveFn({ data: payload });
      navigate({ to: "/creator/onboarding/assinatura" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleAdvance(false);
  };

  return (
    <OnboardingShell title="Redes Sociais" step={1} backTo="/dashboard">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">
          Conecte suas redes sociais
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Opcional. Você pode adicionar depois nas suas configurações.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <SocialField
            icon={<Instagram className="w-5 h-5" />}
            prefix="instagram.com/"
            value={ig}
            onChange={setIg}
            invalid={ig !== "" && !validate(sanitize(ig))}
          />
          <SocialField
            icon={<Music2 className="w-5 h-5" />}
            prefix="tiktok.com/"
            value={tt}
            onChange={setTt}
            invalid={tt !== "" && !validate(sanitize(tt))}
          />
          <SocialField
            icon={<XIcon />}
            prefix="x.com/"
            value={x}
            onChange={setX}
            invalid={x !== "" && !validate(sanitize(x))}
          />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Avançar"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAdvance(true)}
            className="w-full py-3 text-sm text-neutral-600 hover:text-neutral-900 transition"
          >
            Pular por enquanto
          </button>
        </form>
      </div>
    </OnboardingShell>
  );
}

function SocialField({
  icon,
  prefix,
  value,
  onChange,
  invalid,
}: {
  icon: React.ReactNode;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border bg-white px-4 py-3 transition-colors ${
        invalid ? "border-red-500" : "border-neutral-200 focus-within:border-fuchsia-500"
      }`}
    >
      <span className="text-neutral-500">{icon}</span>
      <span className="text-sm text-neutral-500 shrink-0">{prefix}</span>
      <input
        type="text"
        placeholder="seu @"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={31}
        className="flex-1 bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
      />
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
