import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletPayInput = {
  kind: "publication_unlock" | "chat_unlock" | "subscription" | "tip" | "story_unlock" | "video_call" | "paid_dm";
  publicationId?: string;
  messageId?: string;
  storyId?: string;
  creatorId?: string;
  plan?: "monthly" | "quarterly" | "semiannual";
  amountCents?: number;
  message?: string;
  callId?: string;
  requestId?: string;
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
    const kinds = ["publication_unlock", "chat_unlock", "subscription", "tip", "story_unlock", "video_call", "paid_dm"];
    if (!kinds.includes(input.kind)) throw new Error("invalid_kind");
    return input;
  })
  .handler(async ({ data, context }): Promise<WalletPayResult> => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("pay_with_wallet", {
      _kind: data.kind,
      _publication_id: data.publicationId ?? undefined,
      _message_id: data.messageId ?? undefined,
      _creator_id: data.creatorId ?? undefined,
      _plan: data.plan ?? undefined,
      _amount_cents: data.amountCents ?? undefined,
      _message: data.message ?? undefined,
      _story_id: data.storyId ?? undefined,
      _call_id: data.callId ?? undefined,
      _request_id: data.requestId ?? undefined,
    });

    if (error) {
      const raw = error.message ?? "wallet_payment_failed";
      // Postgres RAISE EXCEPTION vem como "insufficient_funds" etc.
      throw new Error(raw);
    }
    const walletResult = result as WalletPayResult;

    // Fire-and-forget: envia emails transacionais (gated pelos switches).
    try {
      const events = await import("./email-events.server");
      if (data.kind === "publication_unlock") {
        await events.notifyPublicationUnlock(walletResult.referenceId);
      } else if (data.kind === "chat_unlock") {
        await events.notifyChatUnlock(walletResult.referenceId);
      } else if (data.kind === "subscription") {
        await events.notifySubscriptionActive(walletResult.referenceId);
      }
      // tip: sem categoria de switch dedicada — nenhum envio por design.
    } catch (err) {
      console.error("[wallet-pay] email dispatch failed", err);
    }

    return walletResult;
  });
