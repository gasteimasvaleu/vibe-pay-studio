import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* =========================================================
 * Sistema de LIVES pagas (Cloudflare Stream — WHIP/WHEP)
 * =========================================================
 * - Criador inicia uma live (`startLive`) → recria um Live Input
 *   na Cloudflare e devolve a URL WHIP para transmitir do navegador.
 * - Espectadores pagam ticket (via saldo/PIX/cartão) para receber a
 *   URL WHEP e assistir com baixa latência (< 1s).
 * - Ao encerrar (`endLive`) o input é destruído no CF.
 * =======================================================*/

type LiveMeta = {
  id: string;
  creatorId: string;
  creatorProfileId: string | null;
  title: string | null;
  description: string | null;
  priceCents: number;
  status: "scheduled" | "live" | "ended";
  coverUrl: string | null;
  startedAt: string;
  endedAt: string | null;
  viewersPeak: number;
  totalViews: number;
  likesCount: number;
};

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ---------- Iniciar live ---------- */
export const startLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { title?: string; description?: string; priceCents: number; coverUrl?: string | null; followersOnly?: boolean }) => {
    const price = Math.max(0, Math.floor(Number(data?.priceCents ?? 0)));
    return {
      title: (data?.title ?? "").trim().slice(0, 120) || null,
      description: (data?.description ?? "").trim().slice(0, 400) || null,
      priceCents: price,
      coverUrl: data?.coverUrl ?? null,
      followersOnly: !!data?.followersOnly,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Pega perfil ativo do criador
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("active_profile_id")
      .eq("user_id", userId)
      .maybeSingle();
    const activeProfileId: string | null = profileRow?.active_profile_id ?? null;

    // Cria Live Input no Cloudflare
    const cf = await import("@/lib/cloudflare-stream.server");
    const input = await cf.createLiveInput({ name: `live-${userId}-${Date.now()}` });

    const webrtcIngest = input.webRTC?.url ?? null;
    const webrtcPlay = input.webRTCPlayback?.url ?? null;
    const hls = input.playback?.hls ?? null;

    const admin = await loadAdmin();
    const { data: row, error } = await admin
      .from("live_sessions")
      .insert({
        creator_id: userId,
        creator_profile_id: activeProfileId,
        title: data.title,
        description: data.description,
        price_cents: data.priceCents,
        cover_url: data.coverUrl,
        status: "live",
        started_at: new Date().toISOString(),
        cf_live_input_id: input.uid,
        cf_webrtc_url: webrtcIngest,
        cf_webrtc_play_url: webrtcPlay,
        cf_playback_hls: hls,
        followers_only: data.followersOnly,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      liveId: row.id as string,
      whipUrl: webrtcIngest,
    };
  });

/* ---------- Encerrar live ---------- */
export const endLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { liveId: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await loadAdmin();
    const { data: live } = await admin
      .from("live_sessions")
      .select("id, creator_id, cf_live_input_id, status")
      .eq("id", data.liveId)
      .maybeSingle();
    if (!live) throw new Error("live não encontrada");
    if (live.creator_id !== userId) throw new Error("apenas o criador pode encerrar");
    if (live.status === "ended") return { ok: true };

    // Destrói o input no CF (silenciosamente)
    if (live.cf_live_input_id) {
      try {
        const cf = await import("@/lib/cloudflare-stream.server");
        await cf.deleteLiveInput(live.cf_live_input_id);
      } catch (e) {
        console.warn("[endLive] delete input falhou", e);
      }
    }

    await admin
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        cf_webrtc_url: null,
      })
      .eq("id", live.id);
    return { ok: true };
  });

/* ---------- Listar lives ao vivo agora ---------- */
export const listActiveLives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = await loadAdmin();
    const { data: lives } = await admin
      .from("live_sessions")
      .select("id, creator_id, creator_profile_id, title, price_cents, cover_url, started_at, viewers_peak, total_views, likes_count")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(50);

    if (!lives || lives.length === 0) return { lives: [] };

    // Enriquecer com perfil do criador
    const profileIds = Array.from(new Set(lives.map((l: any) => l.creator_profile_id).filter(Boolean)));
    const creatorIds = Array.from(new Set(lives.map((l: any) => l.creator_id)));

    const [profs, users] = await Promise.all([
      profileIds.length
        ? admin.from("creator_profiles").select("id, username, display_name, avatar_url").in("id", profileIds)
        : Promise.resolve({ data: [] as any[] }),
      admin.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", creatorIds),
    ]);
    const profMap = new Map((profs.data ?? []).map((p: any) => [p.id, p]));
    const userMap = new Map((users.data ?? []).map((p: any) => [p.user_id, p]));

    return {
      lives: lives.map((l: any) => {
        const src = (l.creator_profile_id && profMap.get(l.creator_profile_id)) || userMap.get(l.creator_id) || {};
        return {
          id: l.id as string,
          creatorId: l.creator_id as string,
          username: src.username ?? "",
          displayName: src.display_name ?? src.username ?? "",
          avatarUrl: src.avatar_url ?? null,
          title: l.title ?? null,
          priceCents: l.price_cents ?? 0,
          coverUrl: l.cover_url ?? null,
          startedAt: l.started_at,
          viewersPeak: l.viewers_peak ?? 0,
          totalViews: l.total_views ?? 0,
          likesCount: l.likes_count ?? 0,
        };
      }),
    };
  });

/* ---------- Live ativa de um criador (para badge/botão no perfil) ---------- */
export const getCreatorActiveLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string }) => data)
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const { data: live } = await admin
      .from("live_sessions")
      .select("id, title, price_cents, started_at, viewers_peak")
      .eq("creator_id", data.creatorId)
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return live
      ? {
          id: live.id as string,
          title: (live.title as string | null) ?? null,
          priceCents: (live.price_cents as number) ?? 0,
          startedAt: live.started_at as string,
          viewersPeak: (live.viewers_peak as number) ?? 0,
        }
      : null;
  });

/* ---------- Live ativa por perfil-alvo (para badge no avatar) ---------- */
export const getActiveLivesForCreators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorIds: string[] }) => ({
    creatorIds: Array.from(new Set((data?.creatorIds ?? []).filter(Boolean))).slice(0, 200),
  }))
  .handler(async ({ data }) => {
    if (data.creatorIds.length === 0) return { liveByCreator: {} as Record<string, string> };
    const admin = await loadAdmin();
    const { data: lives } = await admin
      .from("live_sessions")
      .select("id, creator_id")
      .in("creator_id", data.creatorIds)
      .eq("status", "live");
    const map: Record<string, string> = {};
    for (const l of lives ?? []) map[l.creator_id as string] = l.id as string;
    return { liveByCreator: map };
  });

/* ---------- Metadados detalhados + status de acesso ---------- */
export const getLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { liveId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: live, error } = await supabase
      .from("live_sessions")
      .select("id, creator_id, creator_profile_id, title, description, price_cents, cover_url, status, started_at, ended_at, viewers_peak, total_views, likes_count, cf_webrtc_play_url, cf_playback_hls, followers_only")
      .eq("id", data.liveId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!live) throw new Error("live não encontrada");

    const isOwner = live.creator_id === userId;
    const followersOnly = !!(live as any).followers_only;

    // Checa ticket
    let hasTicket = false;
    if (!isOwner) {
      const { data: ticket } = await supabase
        .from("live_tickets")
        .select("id")
        .eq("live_id", live.id)
        .eq("buyer_id", userId)
        .eq("status", "paid")
        .maybeSingle();
      hasTicket = !!ticket;
    }

    // Checa se segue o criador (obrigatório quando followers_only)
    let isFollower = false;
    if (!isOwner) {
      const { data: fol } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId)
        .eq("followee_id", live.creator_id)
        .limit(1);
      isFollower = !!(fol && fol.length > 0);
    }

    const priceOk = Number(live.price_cents ?? 0) === 0 || hasTicket;
    const followerOk = !followersOnly || isFollower;
    const canWatch = isOwner || (priceOk && followerOk);

    // Info do criador
    const admin = await loadAdmin();
    const [prof, legacy] = await Promise.all([
      live.creator_profile_id
        ? admin.from("creator_profiles").select("username, display_name, avatar_url").eq("id", live.creator_profile_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      admin.from("profiles").select("username, display_name, avatar_url").eq("user_id", live.creator_id).maybeSingle(),
    ]);
    const src = prof.data ?? legacy.data ?? {};

    return {
      id: live.id as string,
      creatorId: live.creator_id as string,
      isOwner,
      hasTicket,
      isFollower,
      followersOnly,
      canWatch,
      title: live.title as string | null,
      description: live.description as string | null,
      priceCents: (live.price_cents as number) ?? 0,
      coverUrl: live.cover_url as string | null,
      status: live.status as "scheduled" | "live" | "ended",
      startedAt: live.started_at as string,
      endedAt: live.ended_at as string | null,
      viewersPeak: (live.viewers_peak as number) ?? 0,
      totalViews: (live.total_views as number) ?? 0,
      likesCount: (live.likes_count as number) ?? 0,
      whepUrl: canWatch ? ((live.cf_webrtc_play_url as string | null) ?? null) : null,
      hlsUrl: canWatch ? ((live.cf_playback_hls as string | null) ?? null) : null,
      creator: {
        username: (src as any).username ?? "",
        displayName: (src as any).display_name ?? (src as any).username ?? "",
        avatarUrl: (src as any).avatar_url ?? null,
      },
    };
  });

/* ---------- Marca visualização (usada quando o player abre) ---------- */
export const registerLiveView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { liveId: string }) => data)
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const { data: live } = await admin
      .from("live_sessions")
      .select("total_views, viewers_peak")
      .eq("id", data.liveId)
      .maybeSingle();
    if (!live) return { ok: false };
    await admin
      .from("live_sessions")
      .update({
        total_views: (live.total_views ?? 0) + 1,
        viewers_peak: Math.max(live.viewers_peak ?? 0, (live.viewers_peak ?? 0) + 1),
      })
      .eq("id", data.liveId);
    return { ok: true };
  });
