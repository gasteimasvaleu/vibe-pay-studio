import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/change-password")({
  head: () => ({
    meta: [
      { title: "Alterar Senha · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) throw redirect({ to: "/entrar" });
    return {};
  },
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    confirm === next &&
    !loading;

  const handleSave = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Senha alterada");
      router.history.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível alterar a senha";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
            Alterar Senha
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28">
        <PasswordField
          value={current}
          onChange={setCurrent}
          placeholder="Senha atual"
          autoComplete="current-password"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <PasswordField
            value={next}
            onChange={setNext}
            placeholder="Nova Senha"
            autoComplete="new-password"
          />
          <PasswordField
            value={confirm}
            onChange={setConfirm}
            placeholder="Repetir a nova senha"
            autoComplete="new-password"
          />
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20">
        <div className="max-w-3xl mx-auto">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSave}
            className="w-full h-12 rounded-md bg-gradient-primary text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block rounded-2xl bg-muted px-5 py-3">
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="border-0 bg-transparent p-0 h-auto text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
      />
    </label>
  );
}
