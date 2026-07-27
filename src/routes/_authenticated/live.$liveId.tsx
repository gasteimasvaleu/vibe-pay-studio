import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Users, Heart, Send, Lock } from "lucide-react";
import { getLive, registerLiveView } from "@/lib/lives.functions";
import { supabase } from "@/integrations/supabase/client";
import { payWithWallet } from "@/lib/wallet-pay.functions";

export const Route = createFileRoute("/_authenticated/live/$liveId")({
  head: () => ({
    meta: [{ title: "Live · Monetisexy" }, { name: "robots", content: "noindex" }],
  }),
  component: LiveViewerPage,
});

function LiveViewerPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getLiveFn = useServerFn(getLive);
  const registerViewFn = useServerFn(registerLiveView);
  const payFn = useServerFn(payWithWallet);
  const [comment, setComment] = useState("");
  const [buying, setBuying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const { data: live, refetch } = useQuery({
    queryKey: ["live", liveId],
    queryFn: () => getLiveFn({ data: { liveId } }),
    refetchInterval: 8000,
  });

  // Registra view (idempotente por sessão simples)
  useEffect(() => {
    if (live?.canWatch) registerViewFn({ data: { liveId } }).catch(() => {});
  }, [live?.canWatch, liveId, registerViewFn]);

  // Conecta WHEP (WebRTC Playback) quando canWatch
  useEffect(() => {
    if (!live?.canWatch || !live.whepUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.ontrack = (ev) => {
          if (cancelled) return;
          if (videoRef.current && ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
            videoRef.current.play().catch(() => {});
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise<void>((r) => {
          if (pc.iceGatheringState === "complete") return r();
          const c = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", c); r(); } };
          pc.addEventListener("icegatheringstatechange", c);
          setTimeout(r, 2500);
        });
        const res = await fetch(live.whepUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) throw new Error(`WHEP HTTP ${res.status}`);
        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (e) {
        console.error("[whep] falha", e);
      }
    })();

    return () => {
      cancelled = true;
      pcRef.current?.close();
    };
  }, [live?.canWatch, live?.whepUrl]);

  // Realtime: status da live e comentários
  useEffect(() => {
    const ch = supabase
      .channel(`live-${liveId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${liveId}` },
        (p: any) => {
          if (p.new?.status === "ended") toast.info("A live foi encerrada");
          qc.invalidateQueries({ queryKey: ["live", liveId] });
          qc.invalidateQueries({ queryKey: ["live-comments", liveId] });
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_comments", filter: `live_id=eq.${liveId}` },
        () => qc.invalidateQueries({ queryKey: ["live-comments", liveId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [liveId, qc]);

  const { data: comments } = useQuery({
    queryKey: ["live-comments", liveId],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_comments")
        .select("id, user_id, content, created_at")
        .eq("live_id", liveId)
        .order("created_at", { ascending: false })
        .limit(80);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  async function handleBuyTicket() {
    if (!live) return;
    setBuying(true);
    try {
      const res: any = await payFn({ data: { kind: "live_ticket", liveId, amountCents: live.priceCents } });
      if (res?.status === "paid" || res?.status === "already") {
        toast.success("Acesso liberado!");
        await refetch();
      } else if (res?.status === "insufficient") {
        toast.error("Saldo insuficiente. Recarregue sua carteira.");
      } else {
        toast.error("Não foi possível pagar com saldo. Use PIX/cartão em breve.");
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("insufficient_balance")) toast.error("Saldo insuficiente");
      else if (msg.includes("cannot_buy_own_live")) toast.error("Você é o dono desta live");
      else toast.error(msg || "Falha ao comprar acesso");
    } finally {
      setBuying(false);
    }
  }

  async function handleLike() {
    if (!live) return;
    await supabase.from("live_likes").insert({ live_id: liveId, user_id: (await supabase.auth.getUser()).data.user!.id });
  }

  async function handleComment() {
    const c = comment.trim();
    if (!c) return;
    setComment("");
    await supabase.from("live_comments").insert({ live_id: liveId, user_id: (await supabase.auth.getUser()).data.user!.id, content: c });
  }

  if (!live) return <div className="min-h-screen bg-black grid place-items-center text-white/60 text-sm">Carregando…</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <button onClick={() => navigate({ to: "/dashboard" })} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          {live.creator.avatarUrl ? (
            <img src={live.creator.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/10" />
          )}
          <div>
            <p className="text-sm font-bold leading-tight">{live.creator.displayName || `@${live.creator.username}`}</p>
            <p className="text-[11px] text-white/60 leading-tight">@{live.creator.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {live.status === "live" && (
            <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-emerald-500 text-white font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-white/70"><Users className="h-3.5 w-3.5" /> {live.viewersPeak}</span>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr,320px]">
        <div className="relative bg-black grid place-items-center">
          {live.status === "ended" ? (
            <p className="text-white/70 text-sm">Esta live foi encerrada.</p>
          ) : live.canWatch ? (
            <video ref={videoRef} playsInline autoPlay controls className="w-full h-full max-h-[80vh] object-contain bg-black" />
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="h-14 w-14 mx-auto rounded-full bg-white/10 grid place-items-center mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">{live.title ?? "Live paga"}</h2>
              {live.description && <p className="text-sm text-white/70 mt-1">{live.description}</p>}
              <p className="text-2xl font-bold mt-4">R$ {(live.priceCents / 100).toFixed(2).replace(".", ",")}</p>
              <button
                onClick={handleBuyTicket}
                disabled={buying}
                className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold shadow-lg shadow-fuchsia-500/30 disabled:opacity-60"
              >
                {buying ? "Processando…" : "Comprar acesso (saldo)"}
              </button>
              <p className="text-[11px] text-white/50 mt-2">Ticket único vale enquanto a live estiver no ar.</p>
            </div>
          )}
        </div>

        <aside className="border-l border-white/10 bg-neutral-950 flex flex-col max-h-[80vh]">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Chat</p>
            <button onClick={handleLike} className="text-white/70 hover:text-red-500"><Heart className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(comments ?? []).length === 0 && (
              <p className="text-xs text-white/40 text-center py-6">Seja o primeiro a comentar</p>
            )}
            {(comments ?? []).slice().reverse().map((c: any) => (
              <div key={c.id} className="text-sm">
                <span className="text-white/50 mr-2">•</span>
                <span>{c.content}</span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
              placeholder="Comentar…"
              className="flex-1 h-9 rounded-full bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/40"
            />
            <button onClick={handleComment} className="h-9 w-9 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 grid place-items-center">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
