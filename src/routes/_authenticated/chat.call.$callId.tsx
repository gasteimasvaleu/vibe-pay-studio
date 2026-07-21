import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { PhoneOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinVideoCall, endVideoCall } from "@/lib/communication.functions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/chat/call/$callId")({
  params: {
    parse: (raw) => {
      const callId = String(raw.callId ?? "");
      if (!UUID_RE.test(callId)) throw notFound();
      return { callId };
    },
    stringify: (params) => ({ callId: params.callId }),
  },
  component: VideoCallRoom,
});

function VideoCallRoom() {
  const { callId } = Route.useParams();
  const navigate = useNavigate();
  const joinFn = useServerFn(joinVideoCall);
  const endFn = useServerFn(endVideoCall);

  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [status, setStatus] = useState<"joining" | "in-call" | "ended">("joining");

  useEffect(() => {
    let cancelled = false;
    let frame: DailyCall | null = null;

    (async () => {
      try {
        const { roomUrl, token } = await joinFn({ data: { callId } });
        if (cancelled || !containerRef.current) return;

        frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            border: "0",
          },
          showLeaveButton: false,
          showFullscreenButton: true,
        });
        callRef.current = frame;

        frame.on("left-meeting", async () => {
          try {
            await endFn({ data: { callId } });
          } catch {}
          setStatus("ended");
        });
        frame.on("error", (e) => {
          toast.error(`Erro na chamada: ${e?.errorMsg ?? "desconhecido"}`);
        });

        await frame.join({ url: roomUrl, token });
        if (!cancelled) setStatus("in-call");
      } catch (err: any) {
        if (cancelled) return;
        toast.error(err?.message ?? "Não foi possível entrar na chamada");
        navigate({ to: "/chat" });
      }
    })();

    return () => {
      cancelled = true;
      const f = callRef.current ?? frame;
      if (f) {
        try {
          f.leave();
        } catch {}
        try {
          f.destroy();
        } catch {}
      }
      callRef.current = null;
    };
  }, [callId, joinFn, endFn, navigate]);

  const hangup = async () => {
    try {
      await callRef.current?.leave();
    } catch {}
    try {
      await endFn({ data: { callId } });
    } catch {}
    navigate({ to: "/chat" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div ref={containerRef} className="absolute inset-0" />
      {status === "joining" && (
        <div className="absolute inset-0 grid place-items-center bg-black/80">
          <div className="flex items-center gap-3 text-lg">
            <Loader2 className="h-6 w-6 animate-spin" />
            Entrando na chamada…
          </div>
        </div>
      )}
      {status === "ended" && (
        <div className="absolute inset-0 grid place-items-center bg-black/90 text-center px-6">
          <div className="space-y-4">
            <div className="text-2xl font-semibold">Chamada encerrada</div>
            <button
              type="button"
              onClick={() => navigate({ to: "/chat" })}
              className="h-10 px-6 rounded-full bg-white text-black font-medium"
            >
              Voltar ao chat
            </button>
          </div>
        </div>
      )}
      {status === "in-call" && (
        <button
          type="button"
          onClick={hangup}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 h-14 w-14 grid place-items-center rounded-full bg-red-600 hover:bg-red-700 shadow-lg z-10"
          aria-label="Encerrar chamada"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
