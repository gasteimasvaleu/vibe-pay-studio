import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const SECRET_CODE =
  "GJRGKYZUHFRWILLGGMYGCLJUGMZTILLBMRSDELLGMJSGCYZSME3WKZJQMM";

export const Route = createFileRoute("/_authenticated/settings/two-factor/setup")({
  head: () => ({
    meta: [
      { title: "Configurar 2FA · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: TwoFactorSetupPage,
});

function TwoFactorSetupPage() {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email ?? "user@monetisexy.com";
      const otpauth = `otpauth://totp/Monetisexy:${encodeURIComponent(
        email
      )}?secret=${SECRET_CODE}&issuer=Monetisexy`;
      const url = await QRCode.toDataURL(otpauth, {
        margin: 1,
        width: 512,
        color: { dark: "#000000", light: "#ffffff" },
      });
      if (mounted) setQrDataUrl(url);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(SECRET_CODE);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar");
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
            Autenticação de Dois Fatores
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Escaneie o QR Code abaixo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use o aplicativo para escanear o QR Code fornecido ou insira o
            código manualmente
          </p>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-card">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code de autenticação"
                className="h-64 w-64"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse bg-muted rounded-md" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted px-5 py-3">
          <span className="flex-1 truncate text-sm text-foreground font-mono">
            {SECRET_CODE}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground transition-colors shrink-0"
            aria-label="Copiar código"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20">
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={copyCode}
            className="h-12 rounded-md"
          >
            Copiar Código
          </Button>
          <Button
            type="button"
            onClick={() => toast.info("Em breve")}
            className="h-12 rounded-md bg-gradient-primary text-primary-foreground"
          >
            Avançar
          </Button>
        </div>
      </div>
    </div>
  );
}
