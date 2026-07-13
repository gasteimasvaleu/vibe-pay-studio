import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/muted")({
  head: () => ({
    meta: [
      { title: "Perfis silenciados · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: MutedPage,
});

function MutedPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Perfis silenciados
          </h1>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Mais informações"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6 text-center">
        <p className="text-muted-foreground">
          Mensagens de perfis silenciados não geram notificações e continuam
          disponíveis no filtro "Silenciados".
        </p>
        <p className="text-muted-foreground">
          Você ainda não silenciou nenhum perfil.
        </p>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfis silenciados</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border p-4 space-y-4">
            <p className="font-bold text-foreground">
              O que acontece quando você silencia um perfil?
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground">
              <li>Mensagens recebidas não serão notificadas.</li>
              <li>Elas continuarão disponíveis no filtro "Silenciados".</li>
              <li>
                O assinante não será avisado — essa ação é privada e só você
                saberá.
              </li>
            </ol>
          </div>
          <Button
            className="w-full rounded-full"
            onClick={() => setOpen(false)}
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
