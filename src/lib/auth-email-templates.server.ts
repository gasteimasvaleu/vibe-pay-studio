/**
 * Server-only HTML templates for Supabase Auth emails, sent via Resend.
 * All templates share the Monetisexy shell used in transactional emails.
 */

const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://monetisexy.com";

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
            Se você não solicitou este e-mail, pode ignorá-lo com segurança.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0;"><a href="${href}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600;">${label}</a></p>
  <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Ou copie e cole este link no seu navegador:</p>
  <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">${href}</p>`;
}

export type SupabaseEmailActionType =
  | "signup"
  | "login"
  | "invite"
  | "recovery"
  | "email_change"
  | "email_change_new"
  | "magiclink"
  | "reauthentication";

export type AuthEmailPayload = {
  email: string;
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: SupabaseEmailActionType | string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
};

export function renderAuthEmail(
  action: string,
  p: AuthEmailPayload,
): { subject: string; html: string } {
  const confirmUrl = `${APP_BASE_URL}/auth/confirm?token_hash=${encodeURIComponent(
    p.token_hash,
  )}&type=${encodeURIComponent(action)}&next=${encodeURIComponent(p.redirect_to || "/")}`;

  switch (action) {
    case "signup":
      return {
        subject: "Confirme seu cadastro no Monetisexy",
        html: shell(
          "Confirme seu cadastro",
          `<h1 style="font-size:20px;margin:0 0 12px;">Bem-vindo(a) ao Monetisexy 🎉</h1>
           <p style="margin:0 0 8px;">Falta só um passo para ativar sua conta. Clique no botão abaixo para confirmar seu e-mail.</p>
           ${button(confirmUrl, "Confirmar meu e-mail")}
           <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Se preferir, use o código de verificação: <strong style="letter-spacing:2px;">${p.token}</strong></p>`,
        ),
      };

    case "recovery":
      return {
        subject: "Redefinição de senha - Monetisexy",
        html: shell(
          "Redefinir senha",
          `<h1 style="font-size:20px;margin:0 0 12px;">Redefinir sua senha</h1>
           <p style="margin:0 0 8px;">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha.</p>
           ${button(confirmUrl, "Redefinir senha")}
           <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Código alternativo: <strong style="letter-spacing:2px;">${p.token}</strong></p>`,
        ),
      };

    case "magiclink":
      return {
        subject: "Seu link de acesso ao Monetisexy",
        html: shell(
          "Link mágico de acesso",
          `<h1 style="font-size:20px;margin:0 0 12px;">Entrar no Monetisexy</h1>
           <p style="margin:0 0 8px;">Use o botão abaixo para acessar sua conta. O link expira em breve.</p>
           ${button(confirmUrl, "Acessar minha conta")}
           <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Código alternativo: <strong style="letter-spacing:2px;">${p.token}</strong></p>`,
        ),
      };

    case "invite":
      return {
        subject: "Você foi convidado(a) para o Monetisexy",
        html: shell(
          "Convite Monetisexy",
          `<h1 style="font-size:20px;margin:0 0 12px;">Você recebeu um convite</h1>
           <p style="margin:0 0 8px;">Aceite o convite para criar sua conta no Monetisexy.</p>
           ${button(confirmUrl, "Aceitar convite")}`,
        ),
      };

    case "email_change":
    case "email_change_new":
      return {
        subject: "Confirme a alteração do seu e-mail - Monetisexy",
        html: shell(
          "Alteração de e-mail",
          `<h1 style="font-size:20px;margin:0 0 12px;">Confirmar novo e-mail</h1>
           <p style="margin:0 0 8px;">Clique no botão abaixo para confirmar a alteração do e-mail da sua conta.</p>
           ${button(confirmUrl, "Confirmar alteração")}
           <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Código alternativo: <strong style="letter-spacing:2px;">${p.token}</strong></p>`,
        ),
      };

    case "reauthentication":
      return {
        subject: "Código de reautenticação - Monetisexy",
        html: shell(
          "Reautenticação",
          `<h1 style="font-size:20px;margin:0 0 12px;">Confirme que é você</h1>
           <p style="margin:0 0 8px;">Use o código abaixo para completar a ação sensível solicitada.</p>
           <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${p.token}</p>`,
        ),
      };

    default:
      return {
        subject: "Monetisexy - Confirmação",
        html: shell(
          "Confirmação",
          `<h1 style="font-size:20px;margin:0 0 12px;">Confirmação necessária</h1>
           <p style="margin:0 0 8px;">Complete a ação clicando no botão abaixo.</p>
           ${button(confirmUrl, "Confirmar")}`,
        ),
      };
  }
}
