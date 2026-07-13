import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { ThemeInit } from "@/components/theme-init";
import { TopBanner } from "@/components/ui/top-banner";
import { Toaster as SonnerToaster } from "sonner";





function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-black tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Monetisexy — Monetize seu conteúdo adulto com liberdade." },
      { name: "description", content: "A plataforma feita para criadores de conteúdo adulto que querem transformar sua audiência em renda real. Publique, gerencie assinaturas e receba pagamentos com" },
      { name: "author", content: "Monetisexy" },
      { property: "og:title", content: "Monetisexy — Monetize seu conteúdo adulto com liberdade." },
      { property: "og:description", content: "A plataforma feita para criadores de conteúdo adulto que querem transformar sua audiência em renda real. Publique, gerencie assinaturas e receba pagamentos com" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Monetisexy — Monetize seu conteúdo adulto com liberdade." },
      { name: "twitter:description", content: "A plataforma feita para criadores de conteúdo adulto que querem transformar sua audiência em renda real. Publique, gerencie assinaturas e receba pagamentos com" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/XP6EhPRz2LXVCgKkgPIyWhnqm6j2/social-images/social-1783532605423-021783532317508a4c6d1552d81c7895c46a24cfcfdd88722896c_0.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/XP6EhPRz2LXVCgKkgPIyWhnqm6j2/social-images/social-1783532605423-021783532317508a4c6d1552d81c7895c46a24cfcfdd88722896c_0.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    ensureCurrentUserProfile().catch((error) => {
      console.error("Failed to sync user profile", error);
    });
  }, []);

  return (
    <>
      <TopBanner />
      <SonnerToaster />
      <QueryClientProvider client={queryClient}>
        <ThemeInit />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </QueryClientProvider>
    </>
  );
}
