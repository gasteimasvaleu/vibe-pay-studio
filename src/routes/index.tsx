import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { HeroCard } from "@/components/site/HeroCard";
import { LoginCard } from "@/components/site/LoginCard";
import { ScrollLanding } from "@/components/landing/ScrollLanding";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      {/* Desktop: scroll-driven landing with background video */}
      <div className="hidden lg:block">
        <ScrollLanding />
      </div>

      {/* Mobile: legacy stacked layout */}
      <section className="lg:hidden relative overflow-hidden -mt-16 pt-16">
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "var(--gradient-radial)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 gap-8">
          <div>
            <HeroCard />
          </div>
          <div className="animate-fade-in">
            <LoginCard />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
