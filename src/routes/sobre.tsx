import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import {
  ArrowRight,
  ShieldCheck,
  Repeat,
  Lock,
  MessageSquare,
  Radio,
  Target,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Monetisexy · Plataforma brasileira para criadores" },
      {
        name: "description",
        content:
          "A Monetisexy é uma plataforma brasileira de assinatura para criadores: pagamento em reais, repasse via Pix e 85% da venda para quem cria.",
      },
      { property: "og:title", content: "Sobre a Monetisexy" },
      {
        property: "og:description",
        content:
          "Plataforma brasileira de assinatura para criadores: Pix nativo, suporte em português e 85% de repasse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SobrePage,
});

const monetizacao = [
  {
    icon: Repeat,
    title: "Assinaturas",
    desc: "Mensal, trimestral ou semestral, com desconto configurável nos planos mais longos.",
  },
  {
    icon: Lock,
    title: "Conteúdo avulso",
    desc: "Posts pagos e Stories pagos vendidos individualmente, dentro ou fora da assinatura.",
  },
  {
    icon: MessageSquare,
    title: "Chat monetizado",
    desc: "Mídia paga, chamadas de vídeo e mensagens em massa segmentadas.",
  },
  {
    icon: Radio,
    title: "Lives",
    desc: "Transmissões com ingresso e recebimento de Mimos em tempo real.",
  },
  {
    icon: Target,
    title: "Desafio",
    desc: "Meta coletiva que a comunidade financia junto para desbloquear conteúdo exclusivo.",
  },
  {
    icon: Users,
    title: "Indicação e Afiliados",
    desc: "Programas para quem quer expandir o alcance do próprio perfil.",
  },
];

const seguranca = [
  "Todo criador passa por verificação de identidade antes de publicar ou receber pagamentos.",
  "Conteúdo pago é protegido tecnicamente contra cópia não autorizada.",
  "Autenticação em dois fatores disponível para qualquer conta.",
  "Canal de denúncia ativo em toda a plataforma, com resposta prioritária.",
];

function SobrePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="py-20 md:py-28 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Quem somos</span>
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">
            Sobre a <span className="text-gradient-primary">Monetisexy</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl">
            A Monetisexy é uma plataforma brasileira de assinatura para criadores de
            conteúdo. Conectamos quem cria com quem quer apoiar e consumir esse conteúdo —
            de forma direta, sem intermediário burocrático, com pagamento em reais e
            repasse via Pix.
          </p>
        </div>
      </section>

      {/* Por que existimos */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Por que existimos</span>
          <h2 className="mt-4 text-xl md:text-2xl font-black tracking-tight">
            Feita do zero para o criador brasileiro
          </h2>
          <div className="mt-6 space-y-5 text-base text-muted-foreground">
            <p>
              Criar conteúdo online virou profissão para milhares de pessoas no Brasil —
              mas boa parte das ferramentas disponíveis foi pensada para outros países,
              com outra moeda, outro sistema bancário e outro idioma.
            </p>
            <p>
              A Monetisexy nasceu para resolver isso: uma plataforma pensada do zero para o
              criador brasileiro, com suporte em português, Pix nativo e sem as taxas de
              conversão de moeda e IOF que penalizam quem recebe em plataformas
              estrangeiras.
            </p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 md:py-20 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="label-caps text-primary">Como funciona</span>
            <h2 className="mt-4 text-xl md:text-2xl font-black tracking-tight">
              Você define o preço e o formato
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Todo criador define seu próprio preço de assinatura e o formato do seu
              conteúdo. Além da assinatura, a Monetisexy oferece várias formas de
              monetização que o criador pode combinar do jeito que fizer sentido para o seu
              público.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monetizacao.map((m) => (
              <div
                key={m.title}
                className="p-5 rounded-2xl bg-background border border-border"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-black tracking-tight mb-1.5">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 md:p-8 rounded-2xl bg-background border border-primary/30">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <div className="text-3xl md:text-4xl font-black tracking-tight text-gradient-primary shrink-0">
                85%
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                De cada venda, o criador fica com 85% — a Monetisexy retém 15% para manter
                e evoluir a plataforma. Sem taxa escondida, sem letra miúda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Segurança em primeiro lugar</span>
          <h2 className="mt-4 text-xl md:text-2xl font-black tracking-tight">
            Levamos a sério a confiança de quem usa a Monetisexy
          </h2>
          <ul className="mt-8 space-y-4">
            {seguranca.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-base text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Para quem é */}
      <section className="py-16 md:py-20 bg-surface border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Para quem é a Monetisexy</span>
          <div className="mt-6 space-y-5 text-base text-muted-foreground">
            <p>
              Para quem cria e quer ser pago de forma justa e transparente por isso.
            </p>
            <p>
              Para quem consome e quer apoiar diretamente os criadores que acompanha, com a
              segurança de saber com quem está lidando. Simples assim.
            </p>
          </div>
          <Link
            to="/como-funciona"
            className="mt-8 inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
          >
            Veja como funciona na prática <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden border border-primary/30 bg-surface">
            <div
              className="absolute inset-0 opacity-40"
              style={{ background: "var(--gradient-radial)" }}
            />
            <div className="relative">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                Comece agora
              </h2>
              <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
                Crie sua conta gratuita e descubra o que a Monetisexy pode fazer por você.
              </p>
              <Link
                to="/cadastro"
                className="mt-8 inline-flex items-center gap-2 px-6 md:px-8 h-11 rounded-md bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                Criar minha conta <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
