/**
 * Metadados client-safe dos e-mails transacionais editáveis no admin.
 * Não importa nada server-only — pode ser usado no bundle do navegador para
 * preview e chips de variáveis.
 */

export const EMAIL_KINDS = [
  "free_to_paid",
  "post_sales",
  "subscription_sales",
  "content_purchase",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  free_to_paid: "Perfil gratuito que se tornou pago",
  post_sales: "Vendas de postagens",
  subscription_sales: "Vendas por inscrições",
  content_purchase: "Compra de conteúdo",
};

export const EMAIL_KIND_DESCRIPTIONS: Record<EmailKind, string> = {
  free_to_paid:
    "Enviado aos seguidores quando um perfil gratuito é aprovado e passa a monetizar.",
  post_sales:
    "Enviado ao criador quando alguém desbloqueia uma publicação sua.",
  subscription_sales:
    "Enviado ao criador quando alguém ativa uma assinatura do seu perfil.",
  content_purchase:
    "Recibo enviado ao comprador quando ele desbloqueia uma publicação ou mensagem.",
};

export const AVAILABLE_VARS: Record<EmailKind, string[]> = {
  post_sales: ["buyerName", "amountBRL", "publicationUrl"],
  content_purchase: ["creatorName", "amountBRL", "publicationUrl", "what"],
  subscription_sales: ["subscriberName", "amountBRL", "planLabel", "dashboardUrl"],
  free_to_paid: ["creatorName", "creatorUrl"],
};

const APP_BASE_URL_CLIENT = "https://monetisexy.com";

export const SAMPLE_VARS: Record<EmailKind, Record<string, string>> = {
  post_sales: {
    buyerName: "Ana Souza",
    amountBRL: "R$ 19,90",
    publicationUrl: `${APP_BASE_URL_CLIENT}/feed?p=abc123`,
  },
  content_purchase: {
    creatorName: "Bruno Lima",
    amountBRL: "R$ 29,90",
    publicationUrl: `${APP_BASE_URL_CLIENT}/feed?p=abc123`,
    what: "publicação",
  },
  subscription_sales: {
    subscriberName: "Carla Dias",
    amountBRL: "R$ 49,90",
    planLabel: "mensal",
    dashboardUrl: `${APP_BASE_URL_CLIENT}/dashboard`,
  },
  free_to_paid: {
    creatorName: "Diego Alves",
    creatorUrl: `${APP_BASE_URL_CLIENT}/perfil/diegoalves`,
  },
};

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const val = vars[k];
    if (val === undefined || val === null) return "";
    return escapeHtml(String(val));
  });
}

export function shellHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 16px;font-weight:700;font-size:18px;">Monetisexy</p>
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Você pode ajustar suas preferências de e-mail em
            <a href="${APP_BASE_URL_CLIENT}/settings/privacy-mail" style="color:#4f46e5;">Configurações → E-mails</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
