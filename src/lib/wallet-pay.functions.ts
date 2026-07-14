import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletPayInput = {
  kind: "publication_unlock" | "chat_unlock" | "subscription" | "tip";
  publicationId?: string;
  messageId?: string;
  creatorId?: string;
  plan?: "monthly" | "quarterly" | "semiannual";
  amountCents?: number;
  message?: string;
};

export type WalletPayResult = {
  ok: true;
  kind: WalletPayInput["kind"];
  referenceId: string;
  creatorId: string;
  amountCents: number;
  newBalanceCents: number;
};

/**
 * Debita o saldo da carteira do assinante e cria o registro pago correspondente
 * (unlock de post, unlock de chat, assinatura ou tip) em uma transação atômica.
 *
 * Toda a validação de preço e autorização acontece na função Postgres
 * `pay_with_wallet`, que também trava o saldo com FOR UPDATE.
 */
export const payWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: WalletPayInput) => {
    if (!input || typeof input !== "object") throw new Error("invalid_input");
    const kinds = ["publication_unlock", "chat_unlock", "subscription", "tip"];
    if (!kinds.includes(input.kind)) throw new Error("invalid_kind");
    return input;
  })
  .handler(async ({ data, context }): Promise<WalletPayResult> => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("pay_with_wallet", {
      _kind: data.kind,
      _publication_id: data.publicationId ?? null,
      _message_id: data.messageId ?? null,
      _creator_id: data.creatorId ?? null,
      _plan: data.plan ?? null,
      _amount_cents: data.amountCents ?? null,
      _message: data.message ?? null,
    });

    if (error) {
      const raw = error.message ?? "wallet_payment_failed";
      // Postgres RAISE EXCEPTION vem como "insufficient_funds" etc.
      throw new Error(raw);
    }
    return result as WalletPayResult;
  });
