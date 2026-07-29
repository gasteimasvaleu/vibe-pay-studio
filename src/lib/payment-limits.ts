// Client-safe: constantes e helpers de mínimos por método de pagamento.
// Espelhado em src/lib/asaas.server.ts para o server validar antes de
// enviar ao Asaas. Mantenha os dois arquivos em sincronia.

export type AsaasPaymentMethod = "PIX" | "CREDIT_CARD" | "BOLETO";

// Menor valor bruto (em centavos) aceito por método, de forma que o líquido
// do creator (bruto − 15% comissão da plataforma − taxa do Asaas) ainda seja
// positivo e razoável. Valores de UI, sempre >= mínimo técnico.
export const PAYMENT_MIN_GROSS_CENTS: Record<AsaasPaymentMethod, number> = {
  PIX: 300, // R$ 3,00 (mínimo técnico ~R$ 2,35)
  CREDIT_CARD: 200, // R$ 2,00 (mínimo técnico ~R$ 0,60)
  BOLETO: 300, // reservado; não está em uso hoje
};

export function getPaymentMethodMinimum(method: AsaasPaymentMethod): number {
  return PAYMENT_MIN_GROSS_CENTS[method];
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMinimum(method: AsaasPaymentMethod): string {
  return brl.format(getPaymentMethodMinimum(method) / 100);
}

const METHOD_LABEL: Record<AsaasPaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "cartão",
  BOLETO: "boleto",
};

/**
 * Traduz erros de pagamento vindos do server (ex.:
 * `amount_below_minimum:PIX:300`) para uma mensagem amigável em pt-BR.
 * Aceita `Error`, string ou qualquer coisa com `.message`.
 */
export function translatePaymentError(err: unknown, fallback = "Erro ao processar pagamento"): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : "";

  const belowMin = raw.match(/amount_below_minimum:(PIX|CREDIT_CARD|BOLETO):(\d+)/);
  if (belowMin) {
    const method = belowMin[1] as AsaasPaymentMethod;
    const cents = Number(belowMin[2]);
    return `Valor mínimo para ${METHOD_LABEL[method]} é ${brl.format(cents / 100)}.`;
  }

  if (raw.includes("amount_too_low_for_fees")) {
    return "Valor muito baixo para cobrir as taxas do meio de pagamento.";
  }

  if (raw === "insufficient_funds") {
    return "Saldo insuficiente na carteira.";
  }

  if (raw === "plan_downgrade_not_allowed") {
    return "Você já tem uma assinatura ativa com esse plano ou maior. Escolha um plano maior para fazer upgrade.";
  }

  if (raw.includes("card_already_tokenized") || /já\s+tokenizado/i.test(raw)) {
    return "Este cartão já está cadastrado em uma conta com o mesmo CPF. Selecione-o na lista de cartões salvos ou pague com PIX.";
  }

  return raw || fallback;
}
