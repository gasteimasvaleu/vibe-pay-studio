import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BROADCAST_AUDIENCES, resolveAudienceIds } from "@/lib/broadcast-audience.server";

export const Route = createFileRoute("/api/public/hooks/dispatch-broadcasts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date().toISOString();
        const { data: jobs, error } = await supabaseAdmin
          .from("broadcast_jobs")
          .select("*")
          .eq("status", "scheduled")
          .lte("scheduled_at", now)
          .order("scheduled_at", { ascending: true })
          .limit(10);

        if (error) {
          console.error("[dispatch-broadcasts] fetch jobs error:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const results: { jobId: string; sent: number; failed: number; status: string }[] = [];

        for (const job of jobs ?? []) {
          try {
            const audiences = Array.isArray(job.filters?.audiences)
              ? (job.filters.audiences as { audience: string; topN?: number }[])
              : [{ audience: job.audience, topN: job.filters?.topN }];

            const ids = new Set<string>();
            for (const a of audiences) {
              if (!BROADCAST_AUDIENCES.includes(a.audience as (typeof BROADCAST_AUDIENCES)[number])) continue;
              const list = await resolveAudienceIds(
                supabaseAdmin as unknown as ReturnType<typeof createClient<Database>>,
                job.creator_id,
                a.audience as (typeof BROADCAST_AUDIENCES)[number],
                a.topN,
              );
              for (const id of list) ids.add(id);
            }

            const recipientIds = Array.from(ids).filter((id) => id !== job.creator_id).slice(0, 1000);

            await supabaseAdmin
              .from("broadcast_jobs")
              .update({ status: "running", updated_at: new Date().toISOString() })
              .eq("id", job.id);

            let sent = 0;
            let failed = 0;
            for (const recipientId of recipientIds) {
              try {
                const { data: threadId, error: tErr } = await supabaseAdmin.rpc("get_or_create_thread", {
                  other_user: recipientId,
                });
                if (tErr || !threadId) {
                  failed++;
                  continue;
                }
                const { error: mErr } = await supabaseAdmin.from("chat_messages").insert({
                  thread_id: threadId as string,
                  sender_id: job.creator_id,
                  content: job.message,
                  price_cents: job.price_cents ?? 0,
                  metadata:
                    Array.isArray(job.media) && job.media.length > 0
                      ? ({ media: job.media } as unknown as never)
                      : ({} as unknown as never),
                });
                if (mErr) {
                  console.error("[dispatch-broadcasts] message insert error:", mErr);
                  failed++;
                  continue;
                }
                sent++;
              } catch (e) {
                console.error("[dispatch-broadcasts] recipient error:", e);
                failed++;
              }
            }

            const finalStatus = failed > 0 && sent === 0 ? "failed" : "completed";
            await supabaseAdmin
              .from("broadcast_jobs")
              .update({ status: finalStatus, sent_count: sent, failed_count: failed, updated_at: new Date().toISOString() })
              .eq("id", job.id);

            results.push({ jobId: job.id, sent, failed, status: finalStatus });
          } catch (e) {
            console.error("[dispatch-broadcasts] job error:", e);
            await supabaseAdmin
              .from("broadcast_jobs")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("id", job.id);
            results.push({ jobId: job.id, sent: 0, failed: 0, status: "failed" });
          }
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
