import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/privacy-mail")({
  head: () => ({
    meta: [
      { title: "Configurações de envio de e-mails · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: PrivacyMailPage,
});

const OPTIONS: { id: string; label: string; description: string }[] = [
  {
    id: "free_to_paid",
    label: "Perfil gratuito que se tornou pago",
    description:
      "Ao selecionar esta opção, você não receberá mais emails de criadores que se tornaram pagos.",
  },
  {
    id: "post_sales",
    label: "Vendas de postagens",
    description:
      "Ao selecionar esta opção, você não receberá mais emails de suas vendas de postagens.",
  },
  {
    id: "subscription_sales",
    label: "Vendas por inscrições",
    description:
      "Ao selecionar esta opção, você não receberá mais emails de suas vendas por inscrições.",
  },
  {
    id: "content_purchase",
    label: "Compra de conteúdo",
    description:
      "Ao selecionar esta opção, você não receberá mais emails de suas compras de conteúdo.",
  },
  {
    id: "creator_referrals",
    label: "Indicações de criador de conteúdo",
    description:
      "Ao selecionar esta opção, você não receberá mais emails de perfis que se tornaram criadores com seu link de indicação.",
  },
];

function PrivacyMailPage() {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>({});

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
            Configurações de envio de e-mails
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {OPTIONS.map((o) => (
          <div key={o.id} className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">{o.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {o.description}
              </p>
            </div>
            <Switch
              checked={!!state[o.id]}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, [o.id]: v }))
              }
              aria-label={o.label}
            />
          </div>
        ))}
      </main>
    </div>
  );
}
