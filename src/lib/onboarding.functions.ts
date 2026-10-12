import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const handleSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[A-Za-z0-9._]+$/)
  .nullable();

const socialLinksSchema = z.object({
  instagram_handle: handleSchema.optional().nullable(),
  tiktok_handle: handleSchema.optional().nullable(),
  x_handle: handleSchema.optional().nullable(),
});

export const saveSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => socialLinksSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        instagram_handle: data.instagram_handle || null,
        tiktok_handle: data.tiktok_handle || null,
        x_handle: data.x_handle || null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const pricingSchema = z.object({
  price_monthly: z.number().min(19.9).max(200),
  discount_quarterly: z.number().int().min(0).max(90),
  discount_semiannual: z.number().int().min(0).max(90),
});

export const saveSubscriptionPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pricingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        price_monthly: data.price_monthly,
        discount_quarterly: data.discount_quarterly,
        discount_semiannual: data.discount_semiannual,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createSessionSchema = z.object({
  return_url: z.string().url(),
});

export const createIdentityVerificationSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.VERIFF_API_KEY;
    const apiSecret = process.env.VERIFF_API_SECRET;
    if (!apiKey || !apiSecret) {
      return {
        ok: false as const,
        error: "veriff_not_configured",
        message:
          "A verificação de documentos ainda não está configurada. Tente novamente em instantes.",
      };
    }

    // Fetch user's name to prefill Veriff person data (opcional; Veriff aceita nomes vazios).
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username")
      .eq("user_id", context.userId)
      .maybeSingle();

    try {
      const body = JSON.stringify({
        verification: {
          callback: data.return_url,
          person: {
            firstName: profile?.username ?? "Creator",
            lastName: "-",
          },
          vendorData: context.userId,
          lang: "pt-BR",
        },
      });

      const { createHmac } = await import("crypto");
      const signature = createHmac("sha256", apiSecret).update(body).digest("hex");

      const res = await fetch("https://stationapi.veriff.com/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": apiKey,
          "X-HMAC-SIGNATURE": signature,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[veriff] create session failed", res.status, text);
        return {
          ok: false as const,
          error: "veriff_error",
          message: "Não foi possível iniciar a verificação. Tente novamente em instantes.",
        };
      }

      const payload = (await res.json()) as {
        status: string;
        verification?: { id: string; url: string; sessionToken?: string };
      };
      const session = payload.verification;
      if (!session?.id || !session.url) {
        console.error("[veriff] unexpected payload", payload);
        return {
          ok: false as const,
          error: "veriff_error",
          message: "Resposta inesperada do provedor de verificação.",
        };
      }

      const { error } = await context.supabase
        .from("profiles")
        .update({
          veriff_session_id: session.id,
          kyc_status: "processing",
        })
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);

      return {
        ok: true as const,
        url: session.url,
        session_id: session.id,
      };
    } catch (err) {
      console.error("[veriff] create session error", err);
      return {
        ok: false as const,
        error: "veriff_error",
        message: err instanceof Error ? err.message : "Erro ao iniciar verificação.",
      };
    }
  });

type KycStatus =
  | "not_started"
  | "processing"
  | "verified"
  | "requires_input"
  | "canceled";

const veriffStatusMap: Record<string, KycStatus> = {
  approved: "verified",
  resubmission_requested: "requires_input",
  declined: "requires_input",
  expired: "canceled",
  abandoned: "canceled",
  review: "processing",
  submitted: "processing",
  created: "processing",
};

/**
 * Consulta o Veriff em dois endpoints e devolve o status normalizado.
 * Loga erros de forma visível (não silencia com warn).
 */
async function fetchVeriffStatus(sessionId: string): Promise<KycStatus | null> {
  const apiKey = process.env.VERIFF_API_KEY;
  const apiSecret = process.env.VERIFF_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", apiSecret).update(sessionId).digest("hex");
  const headers = {
    "Content-Type": "application/json",
    "X-AUTH-CLIENT": apiKey,
    "X-HMAC-SIGNATURE": signature,
  };

  // 1) Endpoint de decisão
  try {
    const res = await fetch(
      `https://stationapi.veriff.com/v1/sessions/${sessionId}/decision`,
      { method: "GET", headers },
    );
    if (res.ok) {
      const payload = (await res.json()) as {
        verification?: { status?: string } | null;
      };
      const v = payload.verification?.status;
      if (v && veriffStatusMap[v]) return veriffStatusMap[v];
      console.warn("[veriff] decision empty/unknown status", { sessionId, payload });
    } else {
      const body = await res.text().catch(() => "");
      console.error("[veriff] decision fetch non-ok", {
        sessionId,
        status: res.status,
        body: body.slice(0, 500),
      });
    }
  } catch (err) {
    console.error("[veriff] decision fetch threw", { sessionId, err: String(err) });
  }

  // 2) Fallback: endpoint de attempts (destrava quando um attempt foi
  // aprovado/recusado no painel mas a decisão de sessão ainda não saiu).
  try {
    const res = await fetch(
      `https://stationapi.veriff.com/v1/sessions/${sessionId}/attempts`,
      { method: "GET", headers },
    );
    if (res.ok) {
      const payload = (await res.json()) as {
        verifications?: Array<{
          id?: string;
          status?: string;
          createdAt?: string;
          updatedAt?: string;
        }> | null;
      };
      const attempts = payload.verifications ?? [];
      if (attempts.length > 0) {
        const sorted = [...attempts].sort((a, b) => {
          const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
          const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
          return tb - ta;
        });
        // Prefer any terminal attempt (approved/declined/etc) over pending ones.
        const terminal = sorted.find(
          (a) =>
            a.status &&
            veriffStatusMap[a.status] &&
            veriffStatusMap[a.status] !== "processing",
        );
        const picked = terminal ?? sorted[0];
        const v = picked?.status;
        if (v && veriffStatusMap[v]) return veriffStatusMap[v];
        console.warn("[veriff] attempts empty/unknown status", { sessionId, payload });
      } else {
        console.warn("[veriff] attempts list empty", { sessionId });
      }
    } else {
      const body = await res.text().catch(() => "");
      console.error("[veriff] attempts fetch non-ok", {
        sessionId,
        status: res.status,
        body: body.slice(0, 500),
      });
    }
  } catch (err) {
    console.error("[veriff] attempts fetch threw", { sessionId, err: String(err) });
  }

  return null;
}

/**
 * Busca nome, nascimento e CPF da decisão Veriff e preenche apenas campos vazios.
 */
export async function fillPersonFromVeriff(supabaseAny: any, userId: string) {
  const apiKey = process.env.VERIFF_API_KEY;
  const apiSecret = process.env.VERIFF_API_SECRET;
  if (!apiKey || !apiSecret) return;
  const { data: prof } = await supabaseAny
    .from("profiles")
    .select("veriff_session_id, cpf, full_name, birth_date")
    .eq("user_id", userId)
    .maybeSingle();
  const sessionId = prof?.veriff_session_id;
  if (!sessionId) return;
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", apiSecret).update(sessionId).digest("hex");
  const res = await fetch(`https://stationapi.veriff.com/v1/sessions/${sessionId}/decision`, {
    headers: { "X-AUTH-CLIENT": apiKey, "X-HMAC-SIGNATURE": signature },
  });
  if (!res.ok) return;
  const payload = (await res.json()) as any;
  const v = payload?.verification ?? {};
  const patch: Record<string, string> = {};
  const fullName = [v.person?.firstName, v.person?.lastName]
    .map((s: any) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");
  if (fullName && !prof.full_name) patch.full_name = fullName;
  const dob = v.person?.dateOfBirth;
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob) && !prof.birth_date)
    patch.birth_date = dob;
  const candidates = [v.person?.idNumber, v.document?.number]
    .map((s: any) => String(s ?? "").replace(/\D/g, ""))
    .filter((s: string) => s.length === 11);
  if (candidates[0] && !prof.cpf) patch.cpf = candidates[0];
  if (Object.keys(patch).length === 0) return;
  await supabaseAny.from("profiles").update(patch).eq("user_id", userId);
}

/**
 * Aplica no banco a transição de kyc_status. Se virar 'verified',
 * promove a conta a creator e dispara o email de "free -> paid".
 * O gatilho `ensure_paid_creator_profile` cuida do creator_profile + active_profile_id.
 */
async function applyKycTransition(
  supabaseAny: any,
  userId: string,
  next: KycStatus,
): Promise<{ verifiedAt: string | null }> {
  const update: {
    kyc_status: KycStatus;
    kyc_verified_at?: string;
    account_type?: string;
    onboarding_completed_at?: string;
  } = { kyc_status: next };
  let verifiedAt: string | null = null;
  if (next === "verified") {
    const now = new Date().toISOString();
    update.kyc_verified_at = now;
    update.account_type = "creator";
    update.onboarding_completed_at = now;
    verifiedAt = now;
    try {
      await fillPersonFromVeriff(supabaseAny, userId);
    } catch (err) {
      console.error("[onboarding] fillPersonFromVeriff failed", err);
    }
  }
  const { error: upErr } = await supabaseAny
    .from("profiles")
    .update(update)
    .eq("user_id", userId);
  if (upErr) {
    console.error("[onboarding] applyKycTransition update failed", upErr);
    throw new Error(upErr.message);
  }
  if (next === "verified") {
    try {
      const events = await import("./email-events.server");
      await events.notifyFreeToPaid(userId);
    } catch (err) {
      console.error("[onboarding] notifyFreeToPaid failed", err);
    }
  }
  return { verifiedAt };
}

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("kyc_status, kyc_verified_at, veriff_session_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let status = (data?.kyc_status ?? "not_started") as KycStatus;
    let verifiedAt = data?.kyc_verified_at ?? null;
    const sessionId = data?.veriff_session_id ?? null;

    if ((status === "processing" || status === "not_started") && sessionId) {
      const next = await fetchVeriffStatus(sessionId);
      if (next && next !== status) {
        const { verifiedAt: newVerifiedAt } = await applyKycTransition(
          context.supabase,
          context.userId,
          next,
        );
        status = next;
        if (newVerifiedAt) verifiedAt = newVerifiedAt;
      }
    }

    return {
      status,
      verified_at: verifiedAt,
      session_id: sessionId,
    };
  });

/**
 * Admin: força reconsulta do KYC no Veriff para um usuário específico
 * e sincroniza no banco. Útil para destravar contas quando o webhook falha.
 */
export const adminRefreshKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status, veriff_session_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.veriff_session_id) {
      return { ok: false as const, message: "Sem session_id do Veriff." };
    }

    const next = await fetchVeriffStatus(profile.veriff_session_id);
    if (!next) {
      return {
        ok: false as const,
        message: "Veriff não retornou um status válido. Veja os logs do servidor.",
      };
    }
    if (next !== profile.kyc_status) {
      await applyKycTransition(supabaseAdmin, data.userId, next);
    }
    return { ok: true as const, status: next };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Perfil Gratuito ("free_creator") — persistência do fluxo
// /criar-perfil-gratuito
// ============================================================

const freeCreatorSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.]+$/)
    .optional()
    .nullable(),
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(500).optional().nullable(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
  coverUrl: z.string().url().max(2048).optional().nullable(),
});

export const createFreeCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => freeCreatorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: current, error: readErr } = await supabase
      .from("profiles")
      .select("account_type, username, display_name, bio, cover_url, kyc_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    // Creator pago: ativa o "modo perfil gratuito" vinculado à mesma conta.
    // Não altera username, account_type nem o perfil creator original.
    // Exige handle separado (free_username) para a URL pública do perfil gratuito.
    if (current?.account_type === "creator") {
      if (!data.handle) throw new Error("handle_required");

      const { data: taken, error: takenErr } = await supabase
        .from("profiles")
        .select("user_id")
        .or(`username.eq.${data.handle},free_username.eq.${data.handle}`)
        .neq("user_id", userId)
        .maybeSingle();
      if (takenErr) throw new Error(takenErr.message);
      if (taken) throw new Error("handle_taken");

      const { data: cpTaken, error: cpTakenErr } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("username", data.handle)
        .neq("user_id", userId)
        .maybeSingle();
      if (cpTakenErr) throw new Error(cpTakenErr.message);
      if (cpTaken) throw new Error("handle_taken");

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          free_profile_enabled: true,
          active_view: "free",
          free_username: data.handle,
          free_display_name: data.displayName,
          free_avatar_url: data.avatarUrl ?? null,
        })
        .eq("user_id", userId);
      if (upErr) throw new Error(upErr.message);

      // Sincroniza/cria o creator_profiles(kind='free') para que busca e perfil
      // usem avatar/capas próprios do perfil gratuito.
      const { data: existingFree } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "free")
        .maybeSingle();

      const freePayload = {
        user_id: userId,
        kind: "free" as const,
        username: data.handle,
        display_name: data.displayName,
        avatar_url: data.avatarUrl ?? null,
        cover_url: data.coverUrl ?? current?.cover_url ?? null,
        bio: data.bio ?? current?.bio ?? null,
        kyc_status: current?.kyc_status ?? "pending",
      };

      if (existingFree?.id) {
        const { error: cpErr } = await supabase
          .from("creator_profiles")
          .update(freePayload)
          .eq("id", existingFree.id)
          .eq("user_id", userId);
        if (cpErr) throw new Error(cpErr.message);
      } else {
        const { error: cpErr } = await supabase
          .from("creator_profiles")
          .insert(freePayload);
        if (cpErr) throw new Error(cpErr.message);
      }

      // Ativa o perfil gratuito criado/atualizado.
      const { data: freeCp } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "free")
        .maybeSingle();
      if (freeCp?.id) {
        await supabase
          .from("profiles")
          .update({ active_profile_id: freeCp.id })
          .eq("user_id", userId);
      }

      return { ok: true, username: data.handle, mode: "linked" as const };
    }

    // Assinante/free_creator: cria/atualiza um perfil gratuito real.
    if (!data.handle) throw new Error("handle_required");

    const { data: taken, error: takenErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", data.handle)
      .neq("user_id", userId)
      .maybeSingle();
    if (takenErr) throw new Error(takenErr.message);
    if (taken) throw new Error("handle_taken");

    const { data: cpTaken, error: cpTakenErr } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("username", data.handle)
      .neq("user_id", userId)
      .maybeSingle();
    if (cpTakenErr) throw new Error(cpTakenErr.message);
    if (cpTaken) throw new Error("handle_taken");

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        username: data.handle,
        account_type: "free_creator",
        display_name: data.displayName,
        bio: data.bio ?? null,
        avatar_url: data.avatarUrl ?? null,
        cover_url: data.coverUrl ?? null,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);

    const { data: existingFree } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "free")
      .maybeSingle();

    const freePayload = {
      user_id: userId,
      kind: "free" as const,
      username: data.handle,
      display_name: data.displayName,
      avatar_url: data.avatarUrl ?? null,
      cover_url: data.coverUrl ?? null,
      bio: data.bio ?? null,
      kyc_status: current?.kyc_status ?? "pending",
    };

    if (existingFree?.id) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update(freePayload)
        .eq("id", existingFree.id)
        .eq("user_id", userId);
      if (cpErr) throw new Error(cpErr.message);
    } else {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .insert(freePayload);
      if (cpErr) throw new Error(cpErr.message);
    }

    const { data: freeCp } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "free")
      .maybeSingle();
    if (freeCp?.id) {
      await supabase
        .from("profiles")
        .update({ active_profile_id: freeCp.id })
        .eq("user_id", userId);
    }

    return { ok: true, username: data.handle, mode: "created" as const };
  });
