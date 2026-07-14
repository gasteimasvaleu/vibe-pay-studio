import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GooeyLoader } from "@/components/onboarding/GooeyLoader";

export function RouteTransitionOverlay() {
  const status = useRouterState({ select: (s) => s.status });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "pending") {
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm animate-fade-in"
    >
      <GooeyLoader
        className="h-48 w-96 text-[22px]"
        primaryColor="oklch(0.62 0.24 305)"
        secondaryColor="oklch(0.72 0.2 330)"
      />
      <p className="mt-6 text-sm font-medium text-neutral-700">Carregando...</p>
    </div>
  );
}
