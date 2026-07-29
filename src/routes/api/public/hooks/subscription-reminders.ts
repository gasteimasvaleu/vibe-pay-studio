import { createFileRoute } from "@tanstack/react-router";

/**
 * Enviado por pg_cron 1x/dia. Percorre assinaturas com `current_period_end`
 * entre agora e +7 dias que ainda não receberam `reminder_sent_at` e dispara
 * um e-mail transacional pedindo renovação manual (auto-renew desativado).
 */
export const Route = createFileRoute("/api/public/hooks/subscription-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          "";
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTransactionalEmail, resolveUserEmail } = await import(
          "@/lib/email.server"
        );

        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 86_400_000);
        const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://monetisexy.com";

        // Assinaturas expirando em até 7 dias, sem lembrete enviado.
        // Só enviamos para quem NÃO tem renovação automática (auto_renew=false).
        // Assinaturas com cartão salvo (auto_renew=true) são cobradas
        // automaticamente pelo Asaas.
        const { data: rows, error } = await (supabaseAdmin as any)
          .from("subscriptions")
          .select(
            "id, subscriber_id, creator_id, plan, price_cents_paid, current_period_end",
          )
          .in("status", ["active", "cancelled"])
          .eq("auto_renew", false)
          .gte("current_period_end", now.toISOString())
          .lte("current_period_end", in7.toISOString())
          .is("reminder_sent_at", null)
          .limit(500);
        if (error) {
          console.error("[reminders] query failed", error.message);
          return new Response(error.message, { status: 500 });
        }

        let sent = 0;
        let skipped = 0;
        for (const sub of rows ?? []) {
          const email = await resolveUserEmail(sub.subscriber_id);
          if (!email) {
            skipped++;
            continue;
          }
          const { data: creator } = await (supabaseAdmin as any)
            .from("profiles")
            .select("username, display_name")
            .eq("user_id", sub.creator_id)
            .maybeSingle();
          const creatorName =
            creator?.display_name ?? creator?.username ?? "Criador";
          const creatorUrl = creator?.username
            ? `${APP_BASE_URL}/perfil/${creator.username}`
            : `${APP_BASE_URL}/subscriptions`;
          const endBr = new Date(sub.current_period_end).toLocaleDateString("pt-BR");
          const html = `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#7c3aed;margin:0 0 12px">Sua assinatura de ${creatorName} expira em breve</h2>
              <p>Olá! Sua assinatura para <strong>${creatorName}</strong> expira em <strong>${endBr}</strong>.</p>
              <p>A renovação não é automática — para manter o acesso ao conteúdo, você precisa renovar manualmente:</p>
              <p style="margin:24px 0">
                <a href="${creatorUrl}" style="background:#7c3aed;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
                  Renovar assinatura
                </a>
              </p>
              <p style="color:#666;font-size:12px">Se preferir, ignore este e-mail e sua assinatura simplesmente expirará no dia ${endBr}.</p>
            </div>
          `;
          const result = await sendTransactionalEmail({
            userId: sub.subscriber_id,
            kind: "subscription_sales",
            to: email,
            subject: `⏰ Sua assinatura de ${creatorName} expira em breve`,
            html,
          });
          if (result.ok) {
            sent++;
            await (supabaseAdmin as any)
              .from("subscriptions")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else {
            skipped++;
          }
        }

        return Response.json({ ok: true, sent, skipped, total: rows?.length ?? 0 });
      },
    },
  },
});
