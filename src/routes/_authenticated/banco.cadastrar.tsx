import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CadastrarBancoForm } from "@/components/banco/CadastrarBancoForm";
import { getCreatorPayoutStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/banco/cadastrar")({
  head: () => ({
    meta: [
      { title: "Cadastrar Dados Bancários · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CadastrarBancoPage,
});

function CadastrarBancoPage() {
  const router = useRouter();
  const close = () => router.history.back();
  const fetchStatus = useServerFn(getCreatorPayoutStatus);
  const statusQuery = useQuery({
    queryKey: ["payoutStatus"],
    queryFn: () => fetchStatus(),
  });
  const kycVerified = statusQuery.data?.kycStatus === "verified";

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-card" />

      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={close}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Cadastrar Dados Bancários
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8">
        <CadastrarBancoForm
          onClose={close}
          kycVerified={kycVerified}
          walletId={statusQuery.data?.walletId ?? ""}
          hasApiKey={statusQuery.data?.hasApiKey ?? false}
          initial={
            statusQuery.data?.payoutAccount
              ? {
                  bankName: (statusQuery.data.payoutAccount as any).bank_name,
                  accountType: (statusQuery.data.payoutAccount as any).account_type,
                  agency: (statusQuery.data.payoutAccount as any).agency,
                  accountNumber: (statusQuery.data.payoutAccount as any).account_number,
                  pixKeyType: (statusQuery.data.payoutAccount as any).pix_key_type,
                  pixKey: (statusQuery.data.payoutAccount as any).pix_key,
                }
              : null
          }
        />
      </main>
    </div>
  );
}

