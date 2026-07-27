import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radio, ArrowLeft } from "lucide-react";
import { startLive } from "@/lib/lives.functions";

export const Route = createFileRoute("/_authenticated/live/nova")({
  head: () => ({
    meta: [
      { title: "Iniciar Live · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NovaLivePage,
});

function NovaLivePage() {
  const navigate = useNavigate();
  const startFn = useServerFn(startLive);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState("0,00");
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    const priceCents = Math.round(Number(priceReais.replace(",", ".").replace(/[^0-9.]/g, "")) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      toast.error("Valor inválido");
      return;
    }
    setStarting(true);
    try {
      const res = await startFn({ data: { title, description, priceCents } });
      toast.success("Live criada. Autorize câmera e microfone.");
      navigate({ to: "/live/$liveId/transmitir", params: { liveId: res.liveId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao iniciar live");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background text-foreground">
      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">Nova live</h1>
          <span className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Configurar transmissão</p>
              <p className="text-xs text-muted-foreground">Baixa latência (WebRTC) via Cloudflare</p>
            </div>
          </div>

          <label className="block text-xs font-semibold text-muted-foreground mb-1">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Bate-papo especial" maxLength={120}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" />

          <label className="block text-xs font-semibold text-muted-foreground mt-4 mb-1">Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />

          <label className="block text-xs font-semibold text-muted-foreground mt-4 mb-1">Valor do ticket (R$)</label>
          <input value={priceReais} onChange={(e) => setPriceReais(e.target.value)} inputMode="decimal"
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" />
          <p className="text-[11px] text-muted-foreground mt-1">Use 0,00 para live gratuita. Comissão da plataforma: 15%.</p>

          <button
            onClick={handleStart}
            disabled={starting}
            className="mt-6 w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold shadow-lg shadow-fuchsia-500/30 hover:opacity-95 disabled:opacity-60"
          >
            {starting ? "Criando…" : "Ir ao vivo agora"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ao entrar ao vivo você aparecerá com uma badge <span className="text-emerald-500 font-semibold">LIVE</span> no seu avatar em todo o app.
        </p>
      </div>
    </div>
  );
}
