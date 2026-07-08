import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import heroBg from "@/assets/hero-bg.jpg";
import {
  Target,
  Zap,
  Lock,
  Bot,
  Globe2,
  CreditCard,
  ArrowRight,
  UserPlus,
  Image as ImageIcon,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const stats = [
  { value: "+10M", label: "Fãs ativos" },
  { value: "+750K", label: "Criadores cadastrados" },
  { value: "LATAM", label: "Em expansão" },
];

const steps = [
  { icon: UserPlus, title: "Crie sua conta", desc: "Cadastro gratuito, sem cartão de crédito. Comece em menos de 2 minutos." },
  { icon: ImageIcon, title: "Publique seu conteúdo", desc: "Fotos, vídeos e posts exclusivos para os seus assinantes." },
  { icon: Wallet, title: "Receba via Pix", desc: "Saque disponível em até 24h direto para a sua conta." },
];

const features = [
  { icon: Target, title: "Você fica com 80%", desc: "Sem surpresas, sem taxas escondidas." },
  { icon: Zap, title: "Pix em até 24h", desc: "Saldo disponível, saque imediato." },
  { icon: Lock, title: "Conteúdo protegido", desc: "DRM integrado, bloqueio de print e marca d'água." },
  { icon: Bot, title: "IA pessoal", desc: "Assistente que analisa seus dados e sugere oportunidades." },
  { icon: Globe2, title: "América Latina", desc: "Maior plataforma de criadores da região." },
  { icon: CreditCard, title: "Pagamentos completos", desc: "Pix, cartão, boleto e carteiras digitais." },
];

const testimonials = [
  { handle: "@gabisaleh", name: "Gabi Saleh", quote: "Poucas profissões me permitem ter o estilo de vida que eu tenho hoje." },
  { handle: "@erickdiaz", name: "Erick Diaz", quote: "Sou 100% focado aqui pelo fato de valorizarem o criador de conteúdo." },
  { handle: "@marimattos", name: "Mari Mattos", quote: "Me permitiu ter liberdade geográfica, viajar e conhecer novos lugares." },
  { handle: "@alexwm10", name: "Alex WM", quote: "Pensei que seria só uma renda extra, mas hoje é minha fonte de renda principal." },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden -mt-16 pt-16">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-44 text-center">
          <span className="inline-block label-caps text-primary mb-6 animate-fade-in">
            Creator economy · Brasil
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] animate-fade-in">
            Monetize,<br />
            <span className="text-gradient-primary">do seu jeito.</span>
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground animate-fade-in">
            A maior plataforma de creator economy do Brasil. Crie seu perfil, publique conteúdo exclusivo e receba via Pix.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link
              to="/cadastro"
              className="px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
            >
              Criar minha conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/como-funciona"
              className="px-8 py-4 rounded-full border border-foreground/30 hover:border-foreground font-semibold transition-colors"
            >
              Como funciona
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
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

      {/* HOW IT WORKS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="label-caps text-primary">Comece agora</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Comece a ganhar em minutos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="group relative p-8 rounded-2xl bg-surface border border-border hover:border-primary/50 transition-all hover:-translate-y-1"
              >
                <div className="text-6xl font-black text-gradient-primary opacity-30 absolute top-4 right-6">
                  0{i + 1}
                </div>
                <s.icon className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="label-caps text-primary">Diferenciais</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Feito no Brasil.<br />Pensado pra quem cria.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all"
              >
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

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="label-caps text-primary">Depoimentos</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              O que dizem os criadores
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <figure
                key={t.handle}
                className="p-6 rounded-2xl bg-surface border border-border flex flex-col"
              >
                <blockquote className="text-base flex-1">"{t.quote}"</blockquote>
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

      {/* FINAL CTA */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-12 md:p-20 text-center overflow-hidden border border-primary/30 bg-surface">
            <div
              className="absolute inset-0 opacity-40"
              style={{ background: "var(--gradient-radial)" }}
            />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">
                Comece a vender em minutos
              </h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
                Crie sua conta, publique seu conteúdo e comece a faturar.
              </p>
              <Link
                to="/cadastro"
                className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity"
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
