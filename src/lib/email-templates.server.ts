/**
 * Server-only rendering for transactional emails.
 *
 * Subjects e corpos ficam em `public.email_templates` (editáveis via admin).
 * Este módulo carrega o template, substitui `{{vars}}` e envelopa no shell
 * comum. Se a linha estiver ausente, cai para o texto padrão hardcoded
 * para não quebrar envios.
 */

const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://monetisexy.com";

export type EmailKind =
  | "free_to_paid"
  | "post_sales"
  | "subscription_sales"
  | "content_purchase"
  | "pix_invoice";

export type EmailVars = Record<string, string | number | null | undefined>;

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fill(template: string, vars: EmailVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const val = vars[k];
    if (val === null || val === undefined) return "";
    return escapeHtml(String(val));
  });
}

export function shell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 16px;font-weight:700;font-size:18px;color:#7c3aed;">Monetisexy</p>
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Você pode ajustar suas preferências de e-mail em
            <a href="${APP_BASE_URL}/settings/privacy-mail" style="color:#7c3aed;">Configurações → E-mails</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Defaults usados quando a linha do banco não existe. */
export const DEFAULT_TEMPLATES: Record<
  EmailKind,
  { subject: string; body_html: string }
> = {
  post_sales: {
    subject: "Você fez uma venda no Monetisexy 🎉",
    body_html: `<h1 style="font-size:20px;margin:0 0 12px;">Nova venda de publicação</h1>
<p style="margin:0 0 12px;">{{buyerName}} desbloqueou seu conteúdo por <strong>{{amountBRL}}</strong>.</p>
<p><a href="{{publicationUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver publicação</a></p>`,
  },
  content_purchase: {
    subject: "Recibo da sua compra no Monetisexy",
    body_html: `<h1 style="font-size:20px;margin:0 0 12px;">Compra confirmada</h1>
<p style="margin:0 0 12px;">Você desbloqueou uma {{what}} de <strong>{{creatorName}}</strong> por <strong>{{amountBRL}}</strong>.</p>
<p><a href="{{publicationUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Acessar agora</a></p>`,
  },
  subscription_sales: {
    subject: "Nova assinatura ativa no seu perfil 🎉",
    body_html: `<h1 style="font-size:20px;margin:0 0 12px;">Você tem um novo assinante</h1>
<p style="margin:0 0 12px;">{{subscriberName}} assinou seu perfil no plano <strong>{{planLabel}}</strong> por <strong>{{amountBRL}}</strong>.</p>
<p><a href="{{dashboardUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver painel</a></p>`,
  },
  free_to_paid: {
    subject: "{{creatorName}} agora é um perfil pago no Monetisexy",
    body_html: `<h1 style="font-size:20px;margin:0 0 12px;">{{creatorName}} agora é um criador pago</h1>
<p style="margin:0 0 12px;">Um perfil que você segue passou a monetizar conteúdo exclusivo.</p>
<p><a href="{{creatorUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver perfil</a></p>`,
  },
  pix_invoice: {
    subject: "Sua cobrança PIX de {{amountBRL}} — assinatura {{creatorName}}",
    body_html: `<h1 style="font-size:22px;margin:0 0 12px;color:#111827;">Sua cobrança PIX está pronta</h1>
<p style="margin:0 0 16px;color:#374151;">Assinatura <strong>{{planLabel}}</strong> de <strong>{{creatorName}}</strong> — <strong>{{amountBRL}}</strong>. Vence em <strong>{{dueDate}}</strong>.</p>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
  <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Escaneie o QR code no app do seu banco</p>
  <img src="{{qrImageDataUrl}}" alt="QR Code PIX" width="220" height="220" style="display:inline-block;width:220px;height:220px;image-rendering:pixelated;background:#ffffff;padding:8px;border-radius:8px;" />
</div>

<p style="margin:16px 0 8px;font-size:13px;color:#6b7280;">Ou copie o código PIX (copia e cola):</p>
<pre style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:0 0 20px;white-space:pre-wrap;word-break:break-all;color:#111827;">{{qrCopyPaste}}</pre>

<p style="text-align:center;margin:24px 0;">
  <a href="{{invoiceUrl}}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">Abrir cobrança</a>
</p>

<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Cobrança gerada pelo Asaas. O código PIX expira em algumas horas — caso perca a validade, uma nova será gerada automaticamente.</p>`,
  },
};

/** Sample values usados no preview do admin e no envio de teste. */
export const SAMPLE_VARS: Record<EmailKind, EmailVars> = {
  post_sales: {
    buyerName: "Ana Souza",
    amountBRL: brl(1990),
    publicationUrl: `${APP_BASE_URL}/feed?p=abc123`,
  },
  content_purchase: {
    creatorName: "Bruno Lima",
    amountBRL: brl(2990),
    publicationUrl: `${APP_BASE_URL}/feed?p=abc123`,
    what: "publicação",
  },
  subscription_sales: {
    subscriberName: "Carla Dias",
    amountBRL: brl(4990),
    planLabel: "mensal",
    dashboardUrl: `${APP_BASE_URL}/dashboard`,
  },
  free_to_paid: {
    creatorName: "Diego Alves",
    creatorUrl: `${APP_BASE_URL}/perfil/diegoalves`,
  },
  pix_invoice: {
    creatorName: "Bruno Lima",
    planLabel: "mensal",
    amountBRL: brl(4990),
    dueDate: "25/07/2026",
    invoiceUrl: `${APP_BASE_URL}/subscriptions`,
    qrImageDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=",
    qrCopyPaste:
      "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5920Monetisexy6009SAO PAULO62070503***6304ABCD",
  },
};

/** Variáveis disponíveis por kind (usado pela UI do admin). */
export const AVAILABLE_VARS: Record<EmailKind, string[]> = {
  post_sales: ["buyerName", "amountBRL", "publicationUrl"],
  content_purchase: ["creatorName", "amountBRL", "publicationUrl", "what"],
  subscription_sales: ["subscriberName", "amountBRL", "planLabel", "dashboardUrl"],
  free_to_paid: ["creatorName", "creatorUrl"],
  pix_invoice: [
    "creatorName",
    "planLabel",
    "amountBRL",
    "dueDate",
    "invoiceUrl",
    "qrImageDataUrl",
    "qrCopyPaste",
  ],
};

/**
 * Renderiza um kind buscando o template no banco (fallback: default).
 */
export async function renderTemplate(
  kind: EmailKind,
  vars: EmailVars,
): Promise<{ subject: string; html: string }> {
  let subject = DEFAULT_TEMPLATES[kind].subject;
  let body = DEFAULT_TEMPLATES[kind].body_html;
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("email_templates")
      .select("subject, body_html")
      .eq("kind", kind)
      .maybeSingle();
    if (data?.subject) subject = data.subject as string;
    if (data?.body_html) body = data.body_html as string;
  } catch (err) {
    console.warn("[email-templates] fallback to default for", kind, err);
  }
  return {
    subject: fill(subject, vars),
    html: shell(fill(body, vars)),
  };
}

/** Render puramente síncrono, sem tocar no banco — usado em preview client. */
export function renderTemplateSync(
  subjectTpl: string,
  bodyTpl: string,
  vars: EmailVars,
): { subject: string; html: string } {
  return { subject: fill(subjectTpl, vars), html: shell(fill(bodyTpl, vars)) };
}
