import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  startPaidVideoCall,
  listActiveCallsWith,
} from "@/lib/communication.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type CreatorInfo = {
  videoCallEnabled: boolean;
  priceCents: number;
  defaultMinutes: number;
};

export function VideoCallHeaderButton({
  partnerId,
  partnerUsername,
}: {
  partnerId: string;
  partnerUsername: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startFn = useServerFn(startPaidVideoCall);
  const listCallsFn = useServerFn(listActiveCallsWith);

  const { data: partner } = useQuery<CreatorInfo>({
    queryKey: ["video-call-partner", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("video_call_enabled, video_call_price_cents, video_call_default_minutes")
        .eq("user_id", partnerId)
        .maybeSingle();
      return {
        videoCallEnabled: !!data?.video_call_enabled,
        priceCents: data?.video_call_price_cents ?? 0,
        defaultMinutes: data?.video_call_default_minutes ?? 15,
      };
    },
    staleTime: 60_000,
  });

  const { data: activeCalls = [] } = useQuery({
    queryKey: ["active-calls", partnerId],
    queryFn: () => listCallsFn({ data: { otherUserId: partnerId } }),
    refetchInterval: 15_000,
  });

  const activeCall = activeCalls.find(
    (c) => c.payment_status === "paid" && c.status === "accepted",
  );

  const startMutation = useMutation({
    mutationFn: () => startFn({ data: { creatorId: partnerId } }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["active-calls", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
      setOpen(false);
      toast.success("Chamada iniciada — entrando…");
      navigate({ to: "/chat/call/$callId", params: { callId: row.id } });
    },
    onError: (err: Error) => {
      if (err.message === "insufficient_wallet_balance") {
        toast.error("Saldo insuficiente. Recarregue sua carteira.");
      } else {
        toast.error(err.message ?? "Erro ao iniciar chamada");
      }
    },
  });

  if (!partner?.videoCallEnabled && !activeCall) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (activeCall) {
            navigate({ to: "/chat/call/$callId", params: { callId: activeCall.id } });
          } else {
            setOpen(true);
          }
        }}
        aria-label={activeCall ? "Entrar na chamada" : "Iniciar chamada de vídeo"}
        className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors relative"
      >
        <Video className="h-5 w-5" />
        {activeCall && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chamada de vídeo com @{partnerUsername}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração</span>
                <span className="font-medium">{partner?.defaultMinutes} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold text-primary">
                  {formatBRL(partner?.priceCents ?? 0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O valor será debitado do seu saldo em carteira. Você entra na sala
              imediatamente e o criador é notificado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="h-9">
              Cancelar
            </Button>
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="h-9"
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Iniciando…
                </>
              ) : (
                "Iniciar chamada"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
