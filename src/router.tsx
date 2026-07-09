import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { GooeyLoader } from "./components/onboarding/GooeyLoader";

function DefaultPendingComponent() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#0b0713]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: "var(--gradient-radial)" }}
      />
      <div className="relative flex flex-col items-center text-center">
        <GooeyLoader className="h-28 w-56 text-[14px]" />
        <p className="mt-8 text-lg font-semibold text-white/90">
          Verificação de identidade em andamento
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
          Isso pode demorar alguns minutos. Você será redirecionado
          automaticamente assim que for concluído.
        </p>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 0,
    defaultPendingMinMs: 300,
    defaultPendingComponent: DefaultPendingComponent,
  });

  return router;
};
