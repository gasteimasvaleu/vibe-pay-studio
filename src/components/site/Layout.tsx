import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({
  children,
  minimalNav = false,
}: {
  children: ReactNode;
  minimalNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar minimal={minimalNav} />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
