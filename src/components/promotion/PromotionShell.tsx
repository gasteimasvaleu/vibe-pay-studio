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
      <header className="sticky top-0 z-20 border-b border-border bg-white">
        <div className="mx-auto max-w-2xl px-5 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate">
            Criando oferta
          </h1>
          <span className="h-9 w-9" />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-6">{children}</div>
      </main>

      {footer && (
        <footer
          className={`${footerLowered ? "relative" : "sticky bottom-24"} z-10 bg-transparent transition-all duration-200`}
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
      <div className="h-1 rounded-md bg-muted overflow-hidden">
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
    <div className={compact ? "mb-4" : "mb-6"}>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

