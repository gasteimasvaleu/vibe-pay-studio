import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "leak-evidence";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  const { data: isMod } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "moderator",
  });
  if (!data && !isMod) throw new Error("acesso negado");
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
}

// ---------- User: upload URL ----------

export const createLeakEvidenceUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filename: string; contentType?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const path = `${userId}/${crypto.randomUUID()}-${safeName(data.filename || "file")}`;
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path: signed.path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ---------- User: create report ----------

export const createLeakReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      title: string;
      leakUrl: string;
      description: string;
      evidencePaths?: string[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const title = (data.title ?? "").trim().slice(0, 200);
    const leakUrl = (data.leakUrl ?? "").trim().slice(0, 2000);
    const description = (data.description ?? "").trim().slice(0, 5000);
    if (!title || !leakUrl || !description) throw new Error("campos obrigatórios");
    try {
      new URL(leakUrl);
    } catch {
      throw new Error("URL inválida");
    }
    const evidencePaths = (data.evidencePaths ?? [])
      .filter((p) => typeof p === "string" && p.startsWith(`${userId}/`))
      .slice(0, 5);

    const { data: row, error } = await supabase
      .from("content_leak_reports")
      .insert({
        reporter_id: userId,
        title,
        leak_url: leakUrl,
        description,
        evidence_paths: evidencePaths,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// ---------- Admin: list ----------

export const listAdminLeakReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; limit?: number; offset?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("content_leak_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 100) - 1);
    if (data.status) {
      const parts = data.status.split(",").filter(Boolean);
      if (parts.length) q = q.in("status", parts);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.reporter_id)));
    const profs: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles_public")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      (p ?? []).forEach((r: any) => (profs[r.user_id] = r));
    }

    const hydrated = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        const evidences: { path: string; url: string | null }[] = [];
        for (const path of (r.evidence_paths as string[]) ?? []) {
          const { data: s } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 300);
          evidences.push({ path, url: s?.signedUrl ?? null });
        }
        return { ...r, reporter: profs[r.reporter_id] ?? null, evidences };
      }),
    );

    return { rows: hydrated, count: count ?? 0 };
  });

// ---------- Admin: update ----------

export const updateLeakReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      status?: "open" | "reviewing" | "resolved" | "dismissed";
      adminNotes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) {
      patch.status = data.status;
      if (data.status === "resolved" || data.status === "dismissed") {
        patch.resolved_by = userId;
        patch.resolved_at = new Date().toISOString();
      }
    }
    if (typeof data.adminNotes === "string") {
      patch.admin_notes = data.adminNotes.slice(0, 2000);
    }

    const { error } = await supabase
      .from("content_leak_reports")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "leak_report.updated",
      target_table: "content_leak_reports",
      target_id: data.id,
      metadata: patch,
    });
    return { ok: true };
  });
