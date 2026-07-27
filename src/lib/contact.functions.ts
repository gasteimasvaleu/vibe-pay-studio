import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CONTACT_REASONS = [
  "Cadastros",
  "Acesso ao Perfil",
  "Pagamentos com Cartão de Crédito",
  "Pagamentos",
  "Cancelar Minha Solicitação de Pagamento",
  "Perguntas Técnicas",
  "Reportar Conteúdo Roubado",
  "Aplicação da Lei / Assunto Jurídico",
  "Relatar Material ou Comportamento Ilegal",
  "Marketing e Parcerias",
  "Problemas com Autenticação 2 Fatores",
  "Outro",
] as const;

const submitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  reason: z.enum(CONTACT_REASONS),
  message: z.string().trim().min(10).max(2000),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => submitSchema.parse(raw))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      reason: data.reason,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

async function logAudit(
  supabase: any,
  actorId: string,
  action: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: "contact_messages",
    target_id: targetId,
    metadata,
  });
}

const listSchema = z.object({
  status: z.string().optional(),
  reason: z.string().optional(),
  search: z.string().optional(),
});

export const listContactMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => listSchema.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.reason) q = q.eq("reason", data.reason);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`name.ilike.${s},email.ilike.${s},message.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const replySchema = z.object({
  id: z.string().uuid(),
  reply: z.string().trim().min(3).max(4000),
});

async function trySendEmail(to: string, name: string, reply: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!apiKey || !resendKey) return { sent: false, reason: "missing_keys" };
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Monetisexy <contato@monetisexy.com>",
        to: [to],
        subject: "Resposta da equipe Monetisexy",
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111">
          <p>Olá, ${name.replace(/</g, "&lt;")}!</p>
          <p>Recebemos seu contato e segue nossa resposta:</p>
          <div style="border-left:3px solid #a855f7;padding:12px 16px;background:#faf5ff;border-radius:8px;white-space:pre-wrap">${reply
            .replace(/</g, "&lt;")
            .replace(/\n/g, "<br/>")}</div>
          <p style="margin-top:24px">Atenciosamente,<br/><strong>Equipe Monetisexy</strong></p>
        </div>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, reason: `resend_${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e: any) {
    return { sent: false, reason: e?.message ?? "unknown" };
  }
}

export const replyContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => replySchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error: fetchErr } = await context.supabase
      .from("contact_messages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("mensagem não encontrada");

    const email = await trySendEmail(row.email, row.name, data.reply);

    const { error } = await context.supabase
      .from("contact_messages")
      .update({
        admin_reply: data.reply,
        answered_by: context.userId,
        answered_at: new Date().toISOString(),
        status: "answered",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "contact.reply", data.id, {
      email_sent: email.sent,
      email_reason: (email as any).reason ?? null,
    });
    return { ok: true, email };
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "answered", "closed"]),
});

export const updateContactStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => statusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("contact_messages")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "contact.status", data.id, {
      status: data.status,
    });
    return { ok: true };
  });
