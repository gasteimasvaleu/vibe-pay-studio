import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getChallengeTiers,
  getChallengeStatus,
} from "@/lib/publications.functions";
import { createChallengeContributionPayment } from "@/lib/payments.functions";
import { translatePaymentError } from "@/lib/payment-limits";
import {
  PaymentModal,
  type CheckoutData,
} from "@/components/payments/PaymentModal";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Props = {
  publicationId: string | null;
  creatorName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContributed?: () => void;
  preselectedTierCents?: number | null;
};

export function ChallengeContributeSheet({
  publicationId,
  creatorName,
  open,
  onOpenChange,
  onContributed,
  preselectedTierCents,
}: Props) {
  const queryClient = useQueryClient();
  const fetchTiers = useServerFn(getChallengeTiers);
  const fetchStatus = useServerFn(getChallengeStatus);
  const createContribution = useServerFn(createChallengeContributionPayment);

  const [selected, setSelected] = useState<number | null>(preselectedTierCents ?? null);
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (open && preselectedTierCents != null) {
      setSelected(preselectedTierCents);
    }
  }, [open, preselectedTierCents]);


  const tiersQuery = useQuery({
    queryKey: ["challenge-tiers", publicationId],
    queryFn: () => fetchTiers({ data: { publicationId: publicationId! } }),
    enabled: !!publicationId && open,
  });

  const statusQuery = useQuery({
    queryKey: ["challenge-status", publicationId],
    queryFn: () => fetchStatus({ data: { publicationId: publicationId! } }),
    enabled: !!publicationId && open,
  });

  const tiers = tiersQuery.data ?? [];
  const status = statusQuery.data;
  const progress = useMemo(() => {
    if (!status || status.goalCents <= 0) return 0;
    return Math.min(100, Math.round((status.raisedCents / status.goalCents) * 100));
  }, [status]);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelected(null);
    }
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!publicationId || selected == null) return;
    setLoading(true);
    try {
      const res = await createContribution({
        data: { publicationId, tierCents: selected },
      });
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        method: "PIX",
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
      setModalOpen(true);
    } catch (e: any) {
      toast.error(translatePaymentError(e, "Erro ao gerar contribuição"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="mx-auto sm:max-w-[420px] rounded-t-3xl border-t border-border bg-background text-foreground p-0 max-h-[92vh] overflow-y-auto"
        >
          <SheetHeader className="px-5 pt-5 pb-3 space-y-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/30 grid place-items-center text-primary">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-base font-bold">
                  Aceitar desafio
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {creatorName ? `de @${creatorName}` : "Contribua para destravar"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="px-5 pb-6 space-y-5">
            {/* Meta + progresso */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Meta do desafio</p>
              <p className="mt-1 text-2xl font-black">
                {status ? brl.format(status.goalCents / 100) : "—"}
              </p>
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Arrecadado{" "}
                    <span className="font-semibold text-foreground">
                      {status ? brl.format(status.raisedCents / 100) : "—"}
                    </span>
                  </span>
                  <span>
                    {status?.contributorCount ?? 0} contribuiç
                    {status?.contributorCount === 1 ? "ão" : "ões"}
                  </span>
                </div>
              </div>
              {status?.reached && (
                <p className="mt-3 text-xs font-semibold text-primary">
                  Meta atingida — conteúdo liberado para quem contribuiu.
                </p>
              )}
              {status?.myContributionCents != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Você já contribuiu com{" "}
                  <span className="font-semibold text-foreground">
                    {brl.format(status.myContributionCents / 100)}
                  </span>
                  .
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Contribuições em desafios não são reembolsáveis.
            </p>

            {/* Faixas */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Escolha uma faixa
              </p>
              {tiersQuery.isLoading ? (
                <div className="py-8 grid place-items-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma faixa configurada.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {tiers.map((t) => {
                    const isSel = selected === t.amountCents;
                    const disabled = status?.myContributionCents != null;
                    return (
                      <button
                        key={t.amountCents}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelected(t.amountCents)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-all",
                          isSel
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-foreground hover:bg-accent",
                          disabled && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Contribuir
                        </p>
                        <p className="text-lg font-black">
                          {brl.format(t.amountCents / 100)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={
                loading ||
                selected == null ||
                tiers.length === 0 ||
                status?.myContributionCents != null
              }
              className="w-full rounded-md font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando PIX...
                </>
              ) : status?.myContributionCents != null ? (
                "Você já contribuiu"
              ) : selected == null ? (
                "Selecione uma faixa"
              ) : (
                `Contribuir com PIX · ${brl.format(selected / 100)}`
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Contribuir com desafio"
        checkout={checkout}
        onPaid={() => {
          toast.success("Contribuição confirmada!");
          setModalOpen(false);
          setCheckout(null);
          onOpenChange(false);
          void queryClient.invalidateQueries({ queryKey: ["challenge-tiers", publicationId] });
          void queryClient.invalidateQueries({ queryKey: ["challenge-status", publicationId] });
          onContributed?.();
        }}
      />
    </>
  );
}
