import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/creator/onboarding/documentos")({
  component: DocumentosLayout,
});

function DocumentosLayout() {
  return <Outlet />;
}
