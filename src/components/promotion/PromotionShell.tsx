import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function PromotionShell({
  step,
  totalSteps,
  onBack,
  children,
  footer,
  footerLowered = false,
}: {
  step: number;
  totalSteps: number;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  footerLowered?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-center text-sm font-medium text-foreground">
            Criando oferta
          </p>
          <span className="h-9 w-9" />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-6">{children}</div>
      </main>

      {footer && (
        <footer
          className={`sticky ${footerLowered ? "bottom-0" : "bottom-24"} z-10 bg-transparent transition-[bottom] duration-200`}
        >
          <div className="mx-auto max-w-2xl px-5 pb-2 pt-3">{footer}</div>
        </footer>
      )}
    </div>
  );
}

export function PromotionProgress({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps: number;
}) {
  const pct = Math.min(100, Math.max(0, (step / totalSteps) * 100));
  return (
    <div className="mb-6">
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PromotionHeader({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mb-5" : "mb-8"}>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

