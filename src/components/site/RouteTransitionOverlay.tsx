import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GooeyLoader } from "@/components/onboarding/GooeyLoader";

export function RouteTransitionOverlay() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }

    const showTimer = setTimeout(() => setVisible(true), 400);
    const maxVisibleTimer = setTimeout(() => setVisible(false), 4_000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(maxVisibleTimer);
    };
  }, [isLoading, pathname]);

  useEffect(() => {
    if (!visible) return;

    const contentReadyTimer = setTimeout(() => {
      const hasRenderedRouteContent =
        document.querySelector("main") ||
        document.querySelector("[data-route-content]") ||
        document.querySelector("header");

      if (hasRenderedRouteContent) {
        setVisible(false);
      }
    }, 1_000);

    return () => clearTimeout(contentReadyTimer);
  }, [visible, pathname]);

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

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
