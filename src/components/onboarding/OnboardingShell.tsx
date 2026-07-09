import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface OnboardingShellProps {
  title: string;
  step: number; // 1..3
  totalSteps?: number;
  backTo?: string;
  children: ReactNode;
}

export function OnboardingShell({
  title,
  step,
  totalSteps = 3,
  backTo,
  children,
}: OnboardingShellProps) {
  const router = useRouter();
  const progress = Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: "var(--gradient-radial)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <header className="relative z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4 px-4 md:px-6 h-14">
          {backTo ? (
            <Link
              to={backTo}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.history.back()}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="flex-1 text-center text-sm md:text-base font-semibold text-foreground/90">
            {title}
          </h1>
          <span className="w-9" aria-hidden />
        </div>
        <div className="h-1 w-full bg-white/5 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-14">
        {children}
      </main>
    </div>
  );
}
