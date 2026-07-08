import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona · Monetize" },
      { name: "description", content: "Entenda como funciona a plataforma Monetize: cadastro, publicação, monetização e saques via Pix." },
      { property: "og:title", content: "Como funciona · Monetize" },
      { property: "og:description", content: "Passo a passo, taxas, proteção de conteúdo e calculadora de ganhos." },
    ],
  }),
  component: ComoFuncionaPage,
});

const faqs = [
  { q: "Como recebo meus pagamentos?", a: "Via Pix, com saque disponível em até 24h após a solicitação. Você também pode receber por transferência bancária." },
  { q: "Qual é a taxa da plataforma?", a: "Você fica com 80% do valor bruto de assinaturas, PPV e gorjetas. Sem taxas escondidas ou mensalidades." },
  { q: "Meu conteúdo fica protegido?", a: "Sim. Aplicamos DRM, marca d'água dinâmica e bloqueio de print em dispositivos suportados." },
  { q: "Posso ter conta gratuita e paga ao mesmo tempo?", a: "Sim. Você pode oferecer prévias gratuitas e conteúdo premium por assinatura no mesmo perfil." },
  { q: "Preciso pagar para começar?", a: "Não. O cadastro é 100% gratuito e sem cartão de crédito." },
];

function ComoFuncionaPage() {
  const [subs, setSubs] = useState(500);
  const [price, setPrice] = useState(29.9);
  const gross = subs * price;
  const net = gross * 0.8;

  return (
    <SiteLayout>
      <section className="py-24 md:py-32 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="label-caps text-primary">Guia completo</span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tighter">
            Como funciona a<br />
            <span className="text-gradient-primary">plataforma</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Tudo o que você precisa saber para começar a monetizar seu conteúdo hoje.
          </p>
        </div>
      </section>

      {/* Steps detailed */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {[
            { n: "01", t: "Cadastro em 2 minutos", d: "Informe e-mail, nome de usuário e senha. Verifique sua identidade com um documento e uma selfie — processo automático e seguro." },
            { n: "02", t: "Configure seu perfil", d: "Adicione bio, foto, capa e defina o valor da sua assinatura mensal. Você também pode oferecer conteúdo avulso (PPV)." },
            { n: "03", t: "Publique e engaje", d: "Fotos, vídeos, lives e mensagens privadas. Todo o conteúdo é protegido com DRM e marca d'água personalizada." },
            { n: "04", t: "Receba via Pix", d: "Solicite saque a qualquer momento. O valor cai na sua conta em até 24h úteis, direto por Pix." },
          ].map((s) => (
            <div key={s.n} className="flex flex-col md:flex-row gap-8 items-start">
              <div className="text-7xl font-black text-gradient-primary shrink-0">{s.n}</div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold">{s.t}</h3>
                <p className="mt-3 text-muted-foreground text-lg">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Calculadora */}
      <section className="py-24 bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="label-caps text-primary">Calculadora</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Estime seus ganhos
            </h2>
          </div>
          <div className="rounded-3xl bg-background border border-border p-8 md:p-12">
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold">Assinantes ativos</label>
                  <span className="font-mono font-bold text-primary">{subs}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={5000}
                  step={10}
                  value={subs}
                  onChange={(e) => setSubs(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold">Valor da assinatura (R$)</label>
                  <span className="font-mono font-bold text-primary">R$ {price.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={9.9}
                  max={199.9}
                  step={0.1}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="pt-8 border-t border-border grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs label-caps text-muted-foreground">Bruto mensal</div>
                  <div className="text-3xl md:text-4xl font-black mt-1">
                    R$ {gross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs label-caps text-primary">Você recebe (80%)</div>
                  <div className="text-3xl md:text-4xl font-black mt-1 text-gradient-primary">
                    R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="label-caps text-primary">FAQ</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Perguntas frequentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`i${i}`}
                className="rounded-2xl border border-border bg-surface px-6"
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

      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            Criar minha conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
