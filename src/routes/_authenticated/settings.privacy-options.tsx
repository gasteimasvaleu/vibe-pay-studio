import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getPrivacySettings,
  updatePrivacySetting,
  type PrivacySettings,
} from "@/lib/privacy.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPublicListing, setMyPublicListing } from "@/lib/public-directory.functions";

const LISTING_STATUS: Record<string, string> = {
  pending: "Aguardando aprovação da equipe.",
  approved: "Seu perfil está na vitrine pública.",
  rejected: "Seu perfil não foi aprovado para a vitrine. Ajuste foto, capa ou bio e tente de novo.",
};

function PublicListingToggle() {
  const getFn = useServerFn(getMyPublicListing);
  const setFn = useServerFn(setMyPublicListing);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["my-public-listing"], queryFn: () => getFn() });
  if (!q.data) return null;
  const { enabled, status } = q.data;
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-foreground">Mostrar meu perfil na vitrine pública</p>
        <p className="text-sm text-muted-foreground mt-1">
          Nome, foto, capa, bio e preço aparecem para qualquer pessoa e no Google. Seu conteúdo continua bloqueado.
          {enabled && ` ${LISTING_STATUS[status] ?? ""}`}
        </p>
      </div>
      <Switch
        checked={enabled}
        disabled={busy}
        aria-label="Mostrar meu perfil na vitrine pública"
        onCheckedChange={async (v) => {
          setBusy(true);
          try {
            const next = await setFn({ data: { enabled: v } });
            qc.setQueryData(["my-public-listing"], next);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings/privacy-options")({
  head: () => ({
    meta: [
      { title: "Configurações de privacidade · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: () => getPrivacySettings(),
  component: PrivacyOptionsPage,
});

type OptionId = keyof PrivacySettings;

const OPTIONS: { id: OptionId; label: string; description: string }[] = [
  {
    id: "restrict_search",
    label: "Restringir perfil das pesquisas",
    description: "Esta opção pode demorar até uma hora para ter efeito.",
  },
  {
    id: "restrict_search_br",
    label: "Restringir perfil das pesquisas no Brasil",
    description:
      "Esta opção pode demorar até uma hora para ter efeito. O perfil continuará visível para usuários de outros países.",
  },
  {
    id: "restrict_search_country",
    label: "Restringir perfil das pesquisas no meu país",
    description:
      "Esta opção pode demorar até uma hora para ter efeito. O perfil continuará visível para usuários de outros países.",
  },
  {
    id: "show_followers",
    label: "Exibir quantidade de seguidores no perfil",
    description:
      "Esta opção permite que o perfil exiba a quantidade de seguidores.",
  },
  {
    id: "restrict_mentions",
    label: "Restringir menções ao perfil",
    description:
      "Esta opção permite que o perfil não seja mencionado em outros perfis.",
  },
  {
    id: "restrict_friendships",
    label: "Restringir amizades",
    description:
      "Esta opção restringirá que seu perfil apareça como amigo em outros perfis.",
  },
  {
    id: "emails_enabled",
    label: "Configuração de envio de e-mails",
    description: "Ao desativar, a Monetisexy não enviará mais e-mails.",
  },
];

function PrivacyOptionsPage() {
  const router = useRouter();
  const initial = Route.useLoaderData();
  const [state, setState] = useState<PrivacySettings>(initial);
  const [pending, setPending] = useState<Set<OptionId>>(new Set());
  const update = useServerFn(updatePrivacySetting);

  const onToggle = async (id: OptionId, next: boolean) => {
    const previous = state[id];
    setState((s) => ({ ...s, [id]: next }));
    setPending((p) => new Set(p).add(id));
    try {
      await update({ data: { key: id, value: next } });
    } catch (e) {
      setState((s) => ({ ...s, [id]: previous }));
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };

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
            Configurações de privacidade
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
              checked={state[o.id]}
              disabled={pending.has(o.id)}
              onCheckedChange={(v) => onToggle(o.id, v)}
              aria-label={o.label}
            />
          </div>
        ))}
        <PublicListingToggle />
      </main>
    </div>
  );
}
