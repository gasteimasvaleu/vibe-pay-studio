import heroBg from "@/assets/hero-illustration.jpg";
import { cn } from "@/lib/utils";

interface HeroCardProps {
  title?: string;
  highlight?: string;
  description?: string;
  fullHeight?: boolean;
}

export function HeroCard({
  title = "Monetisexy,",
  highlight = "do seu jeito.",
  description = "A maior plataforma de creator economy do Brasil. Crie seu perfil, publique conteúdo exclusivo e receba via Pix.",
  fullHeight = false,
}: HeroCardProps) {
  return (
    <div className="relative h-full">
      <div
        className={cn(
          "relative rounded-[2.5rem] overflow-hidden bg-white shadow-card border border-border flex flex-col items-center",
          fullHeight ? "h-full" : "aspect-square"
        )}
      >
        <div className="pt-10 pb-8 text-center pointer-events-none bg-white">
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
          className="w-full flex-1 min-h-0 object-cover"
        />
        <div className="p-8 pt-6 pointer-events-none bg-white">
          <p className="text-sm text-center text-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
