import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import heroBg from "@/assets/hero-illustration.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
});


function HomePage() {
  return (
    <SiteLayout>
      {/* HERO — split layout */}
      <section className="relative overflow-hidden -mt-16 pt-16">
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "var(--gradient-radial)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-in">
            <div className="rounded-3xl border border-border/50 bg-background/40 backdrop-blur-xl p-8 shadow-card">
              <h2 className="text-2xl font-black tracking-tight">Entrar</h2>
              <p className="mt-2 text-sm text-muted-foreground">Bem-vindo de volta.</p>
              <form className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-email">E-mail</Label>
                  <Input id="hero-email" type="email" placeholder="voce@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-password">Senha</Label>
                  <Input id="hero-password" type="password" placeholder="••••••••" />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-gradient-primary font-semibold shadow-glow hover:opacity-90"
                >
                  Entrar
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-white shadow-card border border-border flex flex-col items-center">
              <div className="pt-8 pb-2 text-center pointer-events-none bg-white">
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-[0.95]">
                  Monetisex,<br />
                  <span className="text-gradient-primary">do seu jeito.</span>
                </h1>
              </div>
              <img
                src={heroBg}
                alt="Ilustração Monetisex"
                width={1200}
                height={1200}
                className="w-full h-[58%] object-cover mt-4"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none bg-white">
                <p className="text-sm text-center text-foreground">
                  A maior plataforma de creator economy do Brasil. Crie seu perfil, publique conteúdo exclusivo e receba via Pix.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}
