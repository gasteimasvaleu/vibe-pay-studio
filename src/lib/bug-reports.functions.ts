import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "bug-evidence";

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

export const createBugEvidenceUploadUrl = createServerFn({ method: "POST" })
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

export const createBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      title: string;
      description: string;
      mediaPaths?: string[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const title = (data.title ?? "").trim().slice(0, 200);
    const description = (data.description ?? "").trim().slice(0, 5000);
    if (!title || !description) throw new Error("campos obrigatórios");
    const mediaPaths = (data.mediaPaths ?? [])
      .filter((p) => typeof p === "string" && p.startsWith(`${userId}/`))
      .slice(0, 5);

    const { data: row, error } = await (supabase as any)
      .from("bug_reports")
      .insert({
        reporter_id: userId,
        title,
        description,
        media_paths: mediaPaths,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// ---------- Admin: list ----------

export const listAdminBugReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      status?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = (supabase as any)
      .from("bug_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 100) - 1);
    if (data.status) {
      const parts = data.status.split(",").filter(Boolean);
      if (parts.length) q = q.in("status", parts);
    }
    if (data.priority) {
      const parts = data.priority.split(",").filter(Boolean);
      if (parts.length) q = q.in("priority", parts);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set((rows ?? []).map((r: any) => r.reporter_id as string)),
    ) as string[];
    const profs: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      (p ?? []).forEach((r: any) => (profs[r.user_id] = r));
    }

    const hydrated = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        const medias: { path: string; url: string | null }[] = [];
        for (const path of (r.media_paths as string[]) ?? []) {
          const { data: s } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 3600);
          medias.push({ path, url: s?.signedUrl ?? null });
        }
        return { ...r, reporter: profs[r.reporter_id] ?? null, medias };
      }),
    );

    return { rows: hydrated, count: count ?? 0 };
  });

// ---------- Admin: update ----------

export const updateBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      status?: "open" | "in_progress" | "resolved" | "wont_fix";
      priority?: "low" | "medium" | "high";
      adminNotes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) {
      patch.status = data.status;
      if (data.status === "resolved" || data.status === "wont_fix") {
        patch.resolved_by = userId;
        patch.resolved_at = new Date().toISOString();
      } else {
        patch.resolved_at = null;
        patch.resolved_by = null;
      }
    }
    if (data.priority) patch.priority = data.priority;
    if (typeof data.adminNotes === "string") {
      patch.admin_notes = data.adminNotes.slice(0, 2000);
    }

    const { error } = await (supabase as any)
      .from("bug_reports")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await (supabase as any).from("audit_logs").insert({
      actor_id: userId,
      action: "bug_report.updated",
      target_table: "bug_reports",
      target_id: data.id,
      metadata: patch,
    });
    return { ok: true };
  });
