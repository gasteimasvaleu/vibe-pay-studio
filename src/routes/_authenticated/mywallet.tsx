import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mywallet")({
  component: MyWalletLayout,
});

function MyWalletLayout() {
  return <Outlet />;
}
