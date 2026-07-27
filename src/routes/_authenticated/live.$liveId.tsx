import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/live/$liveId")({
  component: LiveLayout,
});

function LiveLayout() {
  return <Outlet />;
}