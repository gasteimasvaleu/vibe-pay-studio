import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { ArrowRight, Target, Zap, Lock, Bot, Globe2, CreditCard } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre · Monetisex" },
      { name: "description", content: "A história da Monetisex: a maior plataforma de creator economy da América Latina." },
      { property: "og:title", content: "Sobre · Monetisex" },
      { property: "og:description", content: "Criadores no controle. Comunidade de verdade." },
    ],
  }),
  component: SobrePage,
});

const timeline = [
  { year: "2020", title: "O começo", desc: "Nasce em plena pandemia com uma missão: dar aos criadores brasileiros um lugar próprio, com pagamento em Pix e suporte em português." },
  { year: "2022", title: "Expansão nacional", desc: "Chegamos a 250 mil criadores e milhões de fãs ativos, virando referência de creator economy no país." },
  { year: "2024", title: "América Latina", desc: "Lançamento em espanhol, presença em México, Argentina e Colômbia." },
  { year: "2026", title: "Hoje", desc: "Mais de 750 mil criadores, 10 milhões de fãs e a maior plataforma do gênero na região." },
];

const stats = [
  { value: "+10M", label: "Fãs ativos" },
  { value: "+750K", label: "Criadores cadastrados" },
  { value: "LATAM", label: "Em expansão" },
];

const testimonials = [
  { handle: "@gabisaleh", name: "Gabi Saleh", quote: "Poucas profissões me permitem ter o estilo de vida que eu tenho hoje." },
  { handle: "@erickdiaz", name: "Erick Diaz", quote: "Sou 100% focado aqui pelo fato de valorizarem o criador de conteúdo." },
  { handle: "@marimattos", name: "Mari Mattos", quote: "Me permitiu ter liberdade geográfica, viajar e conhecer novos lugares." },
];

const features = [
  { icon: Target, title: "Você fica com 80%", desc: "Sem surpresas, sem taxas escondidas." },
  { icon: Zap, title: "Pix em até 24h", desc: "Saldo disponível, saque imediato." },
  { icon: Lock, title: "Conteúdo protegido", desc: "DRM integrado e marca d'água." },
  { icon: Bot, title: "IA pessoal", desc: "Análise de dados e oportunidades." },
  { icon: Globe2, title: "América Latina", desc: "Maior plataforma da região." },
  { icon: CreditCard, title: "Pagamentos completos", desc: "Pix, cartão, boleto e mais." },
];

function SobrePage() {
  return (
    <SiteLayout>
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Nossa história</span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tighter">
            A história da <span className="text-gradient-primary">Monetisex</span>
          </h1>
          <p className="mt-8 text-lg text-muted-foreground max-w-2xl">
            Construímos a infraestrutura que coloca os criadores no controle. Sem algoritmos, sem intermediários — conexão direta com a sua comunidade.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative border-l border-border pl-8 md:pl-12 space-y-16">
            {timeline.map((t) => (
              <div key={t.year} className="relative">
                <span className="absolute -left-10 md:-left-14 top-1 w-4 h-4 rounded-full bg-gradient-primary shadow-glow" />
                <div className="text-sm label-caps text-primary">{t.year}</div>
                <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t.title}</h3>
                <p className="mt-3 text-muted-foreground text-lg">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-5xl md:text-6xl font-black tracking-tight">{s.value}</div>
              <div className="mt-2 text-sm label-caps text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="label-caps text-primary">Nossa missão</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
            Criadores no controle.<br />Comunidade de verdade.
          </h2>
          <div className="mt-8 space-y-6 text-lg text-muted-foreground">
            <p>
              Acreditamos que quem cria deve ficar com a maior parte do que fatura — e ter total autonomia sobre o próprio trabalho. Por isso construímos uma plataforma onde o criador é dono do relacionamento com seus fãs.
            </p>
            <p>
              Sem algoritmos decidindo quem vê o quê. Sem intermediários entre você e sua audiência. Só ferramentas de qualidade, pagamentos rápidos em Pix e proteção real do seu conteúdo.
            </p>
          </div>
          <Link
            to="/como-funciona"
            className="mt-8 inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
          >
            Veja seu potencial como criador <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="label-caps text-primary">Depoimentos</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Vozes da comunidade
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <figure key={t.handle} className="p-6 rounded-2xl bg-background border border-border">
                <blockquote className="text-base">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.handle}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="label-caps text-primary">Diferenciais</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              O que nos torna únicos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-8 rounded-2xl bg-surface border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-12 md:p-20 text-center overflow-hidden border border-primary/30 bg-surface">
            <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-radial)" }} />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">Faça parte</h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
                Junte-se aos criadores que já estão faturando com autonomia.
              </p>
              <Link
                to="/cadastro"
                className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                Criar minha conta grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
