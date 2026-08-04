import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureCurrentUserProfile } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Entrando · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = async () => {
      if (cancelled) return;
      try {
        await ensureCurrentUserProfile();
      } catch {
        // segue mesmo se o profile já existir / falhar por corrida
      }
      let step: string | null = null;
      try {
        const { resolveCreatorOnboardingStep } = await import("@/lib/onboarding-step");
        step = await resolveCreatorOnboardingStep();
      } catch {
        step = null;
      }
      if (cancelled) return;
      navigate({ to: step ?? "/feed", replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finish();
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        void finish();
        return;
      }
      timeout = setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession();
        if (cancelled) return;
        if (retry.session?.user) {
          void finish();
          return;
        }
        setError("Não foi possível concluir o login com o Google.");
        navigate({ to: "/entrar", replace: true });
      }, 8000);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {error ?? "Entrando..."}
        </p>
      </div>
    </div>
  );
}
