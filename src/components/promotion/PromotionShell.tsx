import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function PromotionShell({
  step,
  totalSteps,
  onBack,
  children,
  footer,
}: {
  step: number;
  totalSteps: number;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, (step / totalSteps) * 100));

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/5 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-center text-sm font-medium text-white/80">
            Criando oferta
          </p>
          <span className="h-9 w-9" />
        </div>
        <div className="mx-auto max-w-2xl px-5 pb-3">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-8">{children}</div>
      </main>

      {footer && (
        <footer className="sticky bottom-0 bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-2xl px-5 py-4">{footer}</div>
        </footer>
      )}
    </div>
  );
}

export function PromotionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
    </div>
  );
}
