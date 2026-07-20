import heroBg from "@/assets/hero-illustration.jpg";

interface HeroCardProps {
  title?: string;
  highlight?: string;
  description?: string;
}

export function HeroCard({
  title = "Monetisexy,",
  highlight = "do seu jeito.",
  description = "A maior plataforma de creator economy do Brasil. Crie seu perfil, publique conteúdo exclusivo e receba via Pix.",
}: HeroCardProps) {
  return (
    <div className="relative">
      <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-white shadow-card border border-border flex flex-col items-center">
        <div className="pt-8 pb-2 text-center pointer-events-none bg-white">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-[0.95]">
            {title}
            <br />
            <span className="text-gradient-primary">{highlight}</span>
          </h1>
        </div>
        <img
          src={heroBg}
          alt="Ilustração Monetisexy"
          width={1200}
          height={1200}
          className="w-full h-[58%] object-cover mt-4"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none bg-white">
          <p className="text-sm text-center text-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
