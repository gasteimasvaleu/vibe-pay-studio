import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { LoginCard } from "@/components/site/LoginCard";
import { HeroCard } from "@/components/site/HeroCard";
import { GlassPromoCard } from "./GlassPromoCard";

const VIDEO_URL =
  "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-02178457259314100000000000000000000ffffc0a870455f887e_1784572784037_c141adff.mp4";

const PROMO_CARDS = [
  {
    eyebrow: "Entre na Monetisexy",
    title: "Sua rede, seu conteúdo, sua regra",
    body:
      "Um espaço só seu para criar, se conectar e ser recompensado por quem você é — sem filtros, sem intermediário te dizendo o que pode ou não pode. Milhares de pessoas já estão aqui, dos dois lados da tela.",
    footer: "Cadastro em menos de 2 minutos. Sem cartão, sem compromisso.",
  },
  {
    eyebrow: "Comece a faturar hoje",
    title: "Sua imagem vale — e agora rende",
    body:
      "Defina seu preço, publique no seu ritmo e receba 85% de tudo que vender — direto na sua conta, via Pix. Assinatura, conteúdo avulso, chamada, gorjeta: você escolhe como monetizar, a gente cuida do resto.",
    footer: "Aprovação em até 2 dias úteis. Primeiro saque liberado assim que confirmado.",
  },
  {
    eyebrow: "Descubra seus criadores favoritos",
    title: "O que você procura, alguém já está criando",
    body:
      "Perfis exclusivos, conteúdo que não existe em nenhum outro lugar, e uma conexão real com quem você acompanha.",
    footer:
      "Pix, cartão, do jeito que for mais fácil pra você. Navegação e cadastro gratuitos — você só paga pelo que quiser assinar.",
  },
];

export function ScrollLanding() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });




  const glassOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1]);
  const glassY = useTransform(scrollYProgress, [0.1, 0.3], [60, 0]);
  const glassScale = useTransform(scrollYProgress, [0.1, 0.3, 0.9, 1], [0.9, 1, 1, 0.96]);

  const loginOpacity = useTransform(scrollYProgress, [0.45, 0.7], [0, 1]);
  const loginX = useTransform(scrollYProgress, [0.45, 0.7], [-80, 0]);

  const heroOpacity = useTransform(scrollYProgress, [0.45, 0.7], [0, 1]);
  const heroX = useTransform(scrollYProgress, [0.45, 0.7], [80, 0]);

  // Fade the glass cards once the foreground is visible
  const glassFade = useTransform(scrollYProgress, [0.5, 0.7], [1, 0.2]);


  return (
    <section ref={sectionRef} className="relative -mt-16" style={{ height: "420vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
        />




        {/* Glass promo cards (mid-layer) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center px-8 pt-16"
          style={{ opacity: glassOpacity }}
        >
          <motion.div
            className="grid grid-cols-3 gap-6 max-w-6xl w-full items-stretch"
            style={{ y: glassY, scale: glassScale, opacity: glassFade }}
          >
            {PROMO_CARDS.map((c) => (
              <GlassPromoCard key={c.title} {...c} />
            ))}
          </motion.div>
        </motion.div>


        {/* Foreground: LoginCard + HeroCard */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pointer-events-none">
          <div className="grid grid-cols-2 gap-12 max-w-7xl w-full px-8 items-stretch">
            <motion.div
              style={{ opacity: loginOpacity, x: loginX }}
              className="pointer-events-auto h-full"
            >
              <LoginCard />
            </motion.div>
            <motion.div
              style={{ opacity: heroOpacity, x: heroX }}
              className="pointer-events-auto h-full"
            >
              <HeroCard fullHeight />
            </motion.div>
          </div>
        </div>


        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-xs uppercase tracking-[0.3em] font-semibold flex flex-col items-center gap-2"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <span>Role para descobrir</span>
          <motion.span
            className="block h-6 w-[2px] bg-white/60"
            animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
