/**
 * Server-only HTML templates for transactional emails.
 * Kept minimal on purpose — inline styles, no assets, safe to render in any client.
 */

const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://vibe-pay-studio.lovable.app";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head>
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
            <a href="${APP_BASE_URL}/settings/privacy-mail" style="color:#4f46e5;">Configurações → E-mails</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function postSaleEmail(input: {
  buyerName: string;
  amountCents: number;
  publicationUrl?: string | null;
}): { subject: string; html: string } {
  const link = input.publicationUrl ?? `${APP_BASE_URL}/dashboard`;
  return {
    subject: "Você fez uma venda no Monetisexy 🎉",
    html: shell(
      "Nova venda",
      `<h1 style="font-size:20px;margin:0 0 12px;">Nova venda de publicação</h1>
       <p style="margin:0 0 12px;">${input.buyerName} desbloqueou seu conteúdo por <strong>${brl(input.amountCents)}</strong>.</p>
       <p style="margin:0 0 20px;">O valor entrará no seu saldo conforme a política de liberação.</p>
       <p><a href="${link}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver publicação</a></p>`,
    ),
  };
}

export function contentPurchaseEmail(input: {
  creatorName: string;
  amountCents: number;
  publicationUrl?: string | null;
  isChat?: boolean;
}): { subject: string; html: string } {
  const link = input.publicationUrl ?? `${APP_BASE_URL}/dashboard`;
  const what = input.isChat ? "mensagem" : "publicação";
  return {
    subject: "Recibo da sua compra no Monetisexy",
    html: shell(
      "Recibo de compra",
      `<h1 style="font-size:20px;margin:0 0 12px;">Compra confirmada</h1>
       <p style="margin:0 0 12px;">Você desbloqueou uma ${what} de <strong>${input.creatorName}</strong> por <strong>${brl(input.amountCents)}</strong>.</p>
       <p><a href="${link}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Acessar agora</a></p>`,
    ),
  };
}

export function subscriptionSaleEmail(input: {
  subscriberName: string;
  amountCents: number;
  plan: string;
}): { subject: string; html: string } {
  const planLabel =
    input.plan === "quarterly"
      ? "trimestral"
      : input.plan === "semiannual"
        ? "semestral"
        : "mensal";
  return {
    subject: "Nova assinatura ativa no seu perfil 🎉",
    html: shell(
      "Nova assinatura",
      `<h1 style="font-size:20px;margin:0 0 12px;">Você tem um novo assinante</h1>
       <p style="margin:0 0 12px;">${input.subscriberName} assinou seu perfil no plano <strong>${planLabel}</strong> por <strong>${brl(input.amountCents)}</strong>.</p>
       <p><a href="${APP_BASE_URL}/dashboard" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver painel</a></p>`,
    ),
  };
}

export function freeToPaidEmail(input: {
  creatorName: string;
  creatorHandle: string;
}): { subject: string; html: string } {
  const link = `${APP_BASE_URL}/perfil/${input.creatorHandle}`;
  return {
    subject: `${input.creatorName} agora é um perfil pago no Monetisexy`,
    html: shell(
      "Perfil se tornou pago",
      `<h1 style="font-size:20px;margin:0 0 12px;">${input.creatorName} agora é um criador pago</h1>
       <p style="margin:0 0 12px;">Um perfil que você segue passou a monetizar conteúdo exclusivo. Confira as novidades e planos disponíveis.</p>
       <p><a href="${link}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver perfil</a></p>`,
    ),
  };
}
