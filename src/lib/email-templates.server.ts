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
  | "content_purchase";

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
};

/** Variáveis disponíveis por kind (usado pela UI do admin). */
export const AVAILABLE_VARS: Record<EmailKind, string[]> = {
  post_sales: ["buyerName", "amountBRL", "publicationUrl"],
  content_purchase: ["creatorName", "amountBRL", "publicationUrl", "what"],
  subscription_sales: ["subscriberName", "amountBRL", "planLabel", "dashboardUrl"],
  free_to_paid: ["creatorName", "creatorUrl"],
  
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
