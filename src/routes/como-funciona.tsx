import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  Camera,
  Crown,
  DollarSign,
  Flame,
  Info,
  SlidersHorizontal,
  Sprout,
  Star,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona · Monetisexy" },
      { name: "description", content: "Descubra seu potencial como creator: simule seus ganhos e entenda o passo a passo para monetizar na Monetisexy." },
      { property: "og:title", content: "Como funciona · Monetisexy" },
      { property: "og:description", content: "Calculadora de ganhos, passo a passo e taxas transparentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComoFuncionaPage,
});

const faqs = [
  { q: "Como recebo meus pagamentos?", a: "Via Pix, com saque disponível em até 24h após a solicitação. Você também pode receber por transferência bancária." },
  { q: "Qual é a taxa da plataforma?", a: "Você fica com 85% do valor bruto de assinaturas, PPV e mimos. Sem taxas escondidas ou mensalidades." },
  { q: "Meu conteúdo fica protegido?", a: "Sim. Aplicamos DRM, marca d'água dinâmica e bloqueio de print em dispositivos suportados." },
  { q: "Posso ter conta gratuita e paga ao mesmo tempo?", a: "Sim. Você pode oferecer prévias gratuitas e conteúdo premium por assinatura no mesmo perfil." },
  { q: "Preciso pagar para começar?", a: "Não. O cadastro é 100% gratuito e sem cartão de crédito." },
];

const LEVELS = [
  { key: "iniciante", label: "Iniciante", icon: Sprout, min: 0 },
  { key: "crescente", label: "Crescente", icon: Flame, min: 500 },
  { key: "destaque", label: "Destaque", icon: Star, min: 5000 },
  { key: "top", label: "Top", icon: Crown, min: 20000 },
] as const;

function frequencyBoost(postsPerWeek: number) {
  // 1x -> 1.0, 7x -> 1.4, 30x -> 2.0 (interpolação suave)
  if (postsPerWeek <= 1) return 1;
  if (postsPerWeek <= 7) return 1 + ((postsPerWeek - 1) / 6) * 0.4;
  return 1.4 + Math.min(1, (postsPerWeek - 7) / 23) * 0.6;
}

function ComoFuncionaPage() {
  const [price, setPrice] = useState(19.9);
  const [followers, setFollowers] = useState(100);
  const [posts, setPosts] = useState(1);

  const { monthly, yearly, level, levelIndex } = useMemo(() => {
    const conversion = 0.015; // 1.5% dos seguidores viram assinantes
    const boost = frequencyBoost(posts);
    const subscribers = Math.max(1, Math.round(followers * conversion * boost));
    const gross = subscribers * price;
    const net = Math.round(gross * 0.85);
    const idx = LEVELS.reduce((acc, l, i) => (net >= l.min ? i : acc), 0);
    return { monthly: net, yearly: net * 12, level: LEVELS[idx], levelIndex: idx };
  }, [price, followers, posts]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="py-8 md:py-12 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="label-caps text-primary">Guia completo</span>
          <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
            Quanto você pode <span className="text-gradient-primary">ganhar?</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Descubra seu potencial como creator
          </p>
        </div>
      </section>

      {/* Calculadora */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sliders */}
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-8">
              <SliderRow
                label="Assinatura mensal"
                value={`R$ ${price.toFixed(2).replace(".", ",")}`}
                min={9.9}
                max={199.9}
                step={0.1}
                current={price}
                onChange={setPrice}
              />
              <SliderRow
                label="Seguidores nas redes sociais"
                value={followers.toLocaleString("pt-BR")}
                min={100}
                max={500000}
                step={100}
                current={followers}
                onChange={setFollowers}
              />
              <SliderRow
                label="Posts por semana na Privacy"
                value={`${posts}x`}
                min={1}
                max={30}
                step={1}
                current={posts}
                onChange={setPosts}
              />
            </div>

            {/* Resultado */}
            <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-background via-background to-primary/25 p-8 md:p-10 flex flex-col items-center justify-center text-center min-h-[360px]">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Como o cálculo é feito"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs text-xs">
                    Estimativa baseada em 1,5% de conversão dos seguidores, ajustada pela frequência de posts e com split de 85% para o creator.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="label-caps text-muted-foreground">Você recebe</span>
              <div className="mt-2 text-5xl md:text-6xl font-black tracking-tight text-gradient-primary">
                R$ {monthly.toLocaleString("pt-BR")}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">por mês</div>

              <div className="mt-5 px-4 py-1.5 rounded-full border border-border/60 bg-background/40 text-sm">
                R$ {yearly.toLocaleString("pt-BR")} por ano
              </div>

              <div className="mt-6 flex items-center gap-3">
                {LEVELS.map((l, i) => {
                  const Icon = l.icon;
                  const active = i === levelIndex;
                  return active ? (
                    <div
                      key={l.key}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow"
                    >
                      <Icon className="w-4 h-4" />
                      {l.label}
                    </div>
                  ) : (
                    <Icon
                      key={l.key}
                      className={`w-5 h-5 ${i < levelIndex ? "text-primary/60" : "text-muted-foreground/40"}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona (steps) */}
      <section className="pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Como funciona</h2>
              <span className="text-primary text-2xl" aria-hidden>◐</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: UserCheck, t: "Crie sua conta", d: "Cadastro gratuito em 2 minutos" },
                { icon: SlidersHorizontal, t: "Configure seu perfil", d: "Capriche na bio, foto de capa, preço e divulgue em outras redes" },
                { icon: Camera, t: "Publique conteúdo", d: "Fotos, vídeos e mensagens exclusivas" },
                { icon: DollarSign, t: "Receba pagamentos", d: "Saque quando quiser, via Pix em até 24h" },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t}>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-5 text-base font-black tracking-tight">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="label-caps text-primary">FAQ</span>
            <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">
              Perguntas frequentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`i${i}`}
                className="rounded-2xl border border-border bg-background px-6"
              >
                <AccordionTrigger className="text-left font-semibold text-base hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-md bg-gradient-primary font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            Criar minha conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <label className="text-base font-semibold">{label}</label>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
