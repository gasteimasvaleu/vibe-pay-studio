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

export const Route = createFileRoute("/_authenticated/settings/restrictions")({
  head: () => ({
    meta: [
      { title: "Assinantes restritos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: RestrictionsPage,
});

function RestrictionsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
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
            Assinantes restritos
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

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 text-center">
        <p className="text-muted-foreground">
          Assinantes restritos não podem interagir com você e novas mensagens
          vindas dele não serão exibidas.
        </p>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinantes restritos</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border p-4 space-y-4">
            <p className="font-bold text-foreground">
              O que ocorre ao restringir um perfil?
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground">
              <li>O assinante não pode mais interagir com você.</li>
              <li>Comentários dele não aparecem em suas publicações.</li>
              <li>Mensagens enviadas por ele não são recebidas por você.</li>
              <li>O assinante não é notificado sobre essa restrição.</li>
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
