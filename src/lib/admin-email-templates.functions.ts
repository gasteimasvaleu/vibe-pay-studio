import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KINDS = [
  "free_to_paid",
  "post_sales",
  "subscription_sales",
  "content_purchase",
  "pix_invoice",
] as const;
export type AdminEmailKind = (typeof KINDS)[number];

export type AdminEmailTemplate = {
  kind: AdminEmailKind;
  subject: string;
  body_html: string;
  updated_at: string;
  updated_by: string | null;
};

async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("forbidden");
}

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminEmailTemplate[]> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("email_templates")
      .select("kind, subject, body_html, updated_at, updated_by")
      .order("kind");
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminEmailTemplate[];
  });

export const updateEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { kind: string; subject: string; body_html: string }) =>
      z
        .object({
          kind: z.enum(KINDS),
          subject: z.string().min(1).max(300),
          body_html: z.string().min(1).max(50_000),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("email_templates")
      .upsert(
        {
          kind: data.kind,
          subject: data.subject,
          body_html: data.body_html,
          updated_by: userId,
        },
        { onConflict: "kind" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string }) =>
    z.object({ kind: z.enum(KINDS) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { DEFAULT_TEMPLATES } = await import(
      "@/lib/email-templates.server"
    );
    const def = DEFAULT_TEMPLATES[data.kind as AdminEmailKind];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("email_templates")
      .upsert(
        {
          kind: data.kind,
          subject: def.subject,
          body_html: def.body_html,
          updated_by: userId,
        },
        { onConflict: "kind" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, subject: def.subject, body_html: def.body_html };
  });

export const sendEmailTemplatePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; to: string }) =>
    z
      .object({
        kind: z.enum(KINDS),
        to: z.string().email().max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { renderTemplate, SAMPLE_VARS } = await import(
      "@/lib/email-templates.server"
    );
    const tpl = await renderTemplate(
      data.kind as AdminEmailKind,
      SAMPLE_VARS[data.kind as AdminEmailKind],
    );

    const resendKey = process.env.RESEND_API_KEY;
    const gatewayKey = process.env.LOVABLE_API_KEY;
    if (!resendKey || !gatewayKey) {
      return { ok: false, error: "resend_not_configured" };
    }
    const defaultFrom =
      process.env.APP_EMAIL_FROM ??
      "Monetisexy <no-reply@monetisexy.com>";

    const res = await fetch(
      "https://connector-gateway.lovable.dev/resend/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${gatewayKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from: defaultFrom,
          to: [data.to],
          subject: `[TESTE] ${tpl.subject}`,
          html: tpl.html,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `resend_${res.status}: ${body}` };
    }
    return { ok: true };
  });
