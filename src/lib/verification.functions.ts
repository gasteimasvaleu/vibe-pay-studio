import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

const BUCKET = "profile-verification";

async function assertAdmin(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("acesso negado");
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MTX-${out}`;
}

export type VerificationState = {
  profileId: string | null;
  profileKind: "paid" | "free" | null;
  profileUsername: string | null;
  verifiedAt: string | null;
  code: string;
  status: "none" | "pending" | "approved" | "rejected";
  adminNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

// ---------- Usuário: estado + código ----------

export const getMyVerificationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerificationState> => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);

    const empty: VerificationState = {
      profileId: null,
      profileKind: null,
      profileUsername: null,
      verifiedAt: null,
      code: makeCode(),
      status: "none",
      adminNotes: null,
      submittedAt: null,
      reviewedAt: null,
    };
    if (!profileId) return empty;

    const [{ data: cp }, { data: last }] = await Promise.all([
      supabase
        .from("creator_profiles")
        .select("id, kind, username, verified_at")
        .eq("id", profileId)
        .maybeSingle(),
      supabase
        .from("profile_verification_requests")
        .select("id, code, status, admin_notes, created_at, reviewed_at")
        .eq("creator_profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const pending = last?.status === "pending";

    return {
      profileId,
      profileKind: (cp?.kind as "paid" | "free") ?? null,
      profileUsername: (cp?.username as string) ?? null,
      verifiedAt: (cp?.verified_at as string) ?? null,
      // Enquanto houver pedido em análise, o código exibido é o do pedido.
      code: pending ? (last?.code as string) : makeCode(),
      status: cp?.verified_at
        ? "approved"
        : ((last?.status as VerificationState["status"]) ?? "none"),
      adminNotes: (last?.admin_notes as string) ?? null,
      submittedAt: (last?.created_at as string) ?? null,
      reviewedAt: (last?.reviewed_at as string) ?? null,
    };
  });

// ---------- Usuário: URL assinada de upload ----------

export const createVerificationUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filename: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const path = `${userId}/${crypto.randomUUID()}-${safeName(data.filename || "foto.jpg")}`;
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path: signed.path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ---------- Usuário: enviar pedido ----------

export const submitVerificationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; photoPaths: string[] }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) throw new Error("perfil_de_criador_nao_encontrado");

    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("verified_at")
      .eq("id", profileId)
      .maybeSingle();
    if (cp?.verified_at) throw new Error("perfil_ja_certificado");

    const { data: pending } = await supabase
      .from("profile_verification_requests")
      .select("id")
      .eq("creator_profile_id", profileId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) throw new Error("ja_existe_pedido_em_analise");

    const photoPaths = (data.photoPaths ?? [])
      .filter((p) => typeof p === "string" && p.startsWith(`${userId}/`))
      .slice(0, 3);
    if (photoPaths.length !== 3) throw new Error("envie_3_fotos");

    const code = (data.code ?? "").trim().slice(0, 20);
    if (!code) throw new Error("codigo_invalido");

    const { data: row, error } = await supabase
      .from("profile_verification_requests")
      .insert({
        user_id: userId,
        creator_profile_id: profileId,
        code,
        photo_paths: photoPaths,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// ---------- Admin: listar ----------

export const listVerificationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; limit?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("profile_verification_requests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) {
      const parts = data.status.split(",").filter(Boolean);
      if (parts.length) q = q.in("status", parts);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const profileIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.creator_profile_id)),
    );

    const [{ data: profs }, { data: cps }] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      profileIds.length
        ? supabase
            .from("creator_profiles")
            .select("id, username, display_name, kind, avatar_url, verified_at")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profMap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => (profMap[p.user_id] = p));
    const cpMap: Record<string, any> = {};
    (cps ?? []).forEach((c: any) => (cpMap[c.id] = c));

    const hydrated = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        const photos: { path: string; url: string | null }[] = [];
        for (const path of (r.photo_paths as string[]) ?? []) {
          const { data: s } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 600);
          photos.push({ path, url: s?.signedUrl ?? null });
        }
        return {
          ...r,
          account: profMap[r.user_id] ?? null,
          profile: cpMap[r.creator_profile_id] ?? null,
          photos,
        };
      }),
    );

    return { rows: hydrated, count: count ?? 0 };
  });

// ---------- Admin: aprovar / recusar ----------

export const reviewVerificationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; decision: "approved" | "rejected"; adminNotes?: string }) =>
      data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    if (data.decision !== "approved" && data.decision !== "rejected") {
      throw new Error("decisao_invalida");
    }
    const notes = (data.adminNotes ?? "").trim().slice(0, 2000);
    if (data.decision === "rejected" && !notes) throw new Error("motivo_obrigatorio");

    const { data: req, error: reqErr } = await supabase
      .from("profile_verification_requests")
      .select("id, creator_profile_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("pedido_nao_encontrado");
    if (req.status !== "pending") throw new Error("pedido_ja_revisado");

    const { error } = await supabase
      .from("profile_verification_requests")
      .update({
        status: data.decision,
        admin_notes: notes || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.decision === "approved") {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", req.creator_profile_id);
      if (cpErr) throw new Error(cpErr.message);
    }

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: `profile_verification.${data.decision}`,
      target_table: "profile_verification_requests",
      target_id: data.id,
      metadata: { creator_profile_id: req.creator_profile_id, notes },
    });

    return { ok: true };
  });

// ---------- Admin: revogar selo ----------

export const revokeProfileVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorProfileId: string; reason?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabase
      .from("creator_profiles")
      .update({ verified_at: null })
      .eq("id", data.creatorProfileId);
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "profile_verification.revoked",
      target_table: "creator_profiles",
      target_id: data.creatorProfileId,
      metadata: { reason: (data.reason ?? "").slice(0, 500) },
    });
    return { ok: true };
  });
