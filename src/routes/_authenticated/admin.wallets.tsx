import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listBlockedWallets, unblockWallet } from "@/lib/admin-wallets.functions";

export const Route = createFileRoute("/_authenticated/admin/wallets")({
  head: () => ({ meta: [{ title: "Carteiras bloqueadas · Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminWallets,
});

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminWallets() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlockedWallets);
  const unblockFn = useServerFn(unblockWallet);
  const q = useQuery({ queryKey: ["admin-blocked-wallets"], queryFn: () => listFn(), staleTime: 15_000 });
  const mut = useMutation({
    mutationFn: (v: { userId: string; note: string }) => unblockFn({ data: v }),
    onSuccess: () => {
      toast.success("Carteira liberada");
      qc.invalidateQueries({ queryKey: ["admin-blocked-wallets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao liberar"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Carteiras bloqueadas</h1>
        <p className="text-sm text-muted-foreground">
          Recargas estornadas ou com chargeback em que o saldo não cobriu o valor.
        </p>
      </div>
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (q.data ?? []).length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Nenhuma carteira bloqueada.</Card>
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((w) => (
            <Card key={w.userId} className="p-4 flex flex-wrap items-center gap-4">
              <div className="min-w-[160px]">
                <p className="font-semibold text-foreground">@{w.username ?? w.userId.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.blockedAt ? `Bloqueada em ${new Date(w.blockedAt).toLocaleString("pt-BR")}` : "Liberada"}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Dívida</p>
                <p className="font-semibold text-destructive">{brl(w.debtCents)}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Saldo</p>
                <p className="font-semibold text-foreground">{brl(w.balanceCents)}</p>
              </div>
              <p className="flex-1 text-xs text-muted-foreground break-words">{w.blockedReason}</p>
              {w.blockedAt && (
                <Button
                  size="sm"
                  disabled={mut.isPending}
                  onClick={() => {
                    const note = window.prompt("Observação para liberar a carteira:");
                    if (note?.trim()) mut.mutate({ userId: w.userId, note });
                  }}
                >
                  Liberar carteira
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
