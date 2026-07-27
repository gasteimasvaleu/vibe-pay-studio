import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const targetId = data.userId;

    const [
      profileRes,
      rolesRes,
      profilesRes,
      subWalletRes,
      creatorWalletRes,
      txRes,
      subsInRes,
      subsOutRes,
      pubsRes,
      storiesRes,
      livesRes,
      withdrawalsRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetId).maybeSingle(),
      supabase.from("user_roles").select("id, role, created_at").eq("user_id", targetId),
      supabase
        .from("creator_profiles")
        .select("id, kind, username, display_name, avatar_url, kyc_status, price_monthly, created_at")
        .eq("user_id", targetId),
      supabase.from("subscriber_wallets").select("*").eq("user_id", targetId).maybeSingle(),
      supabase.from("creator_wallets").select("*").eq("user_id", targetId).maybeSingle(),
      supabase
        .from("transactions")
        .select(
          "id, kind, status, amount_cents_gross, platform_fee_cents, net_cents, payment_method, provider, buyer_id, creator_id, created_at",
        )
        .or(`buyer_id.eq.${targetId},creator_id.eq.${targetId}`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscriptions")
        .select("id, creator_id, plan, status, price_cents_paid, auto_renew, current_period_end, created_at")
        .eq("subscriber_id", targetId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("subscriptions")
        .select("id, subscriber_id, plan, status, price_cents_paid, auto_renew, current_period_end, created_at")
        .eq("creator_id", targetId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("publications")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetId),
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", targetId),
      supabase
        .from("live_sessions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", targetId),
      supabase
        .from("withdrawals")
        .select("id, amount_cents, net_cents, status, requested_at, processed_at")
        .eq("creator_id", targetId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("content_reports")
        .select("id, status, target_type, reason, created_at")
        .eq("reporter_id", targetId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (!profileRes.data) throw new Error("usuário não encontrado");

    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []) as { id: string; role: string; created_at: string }[],
      creatorProfiles: creatorProfilesOr(profilesRes.data),
      wallets: {
        subscriber: subWalletRes.data ?? null,
        creator: creatorWalletRes.data ?? null,
      },
      transactions: txRes.data ?? [],
      subscriptionsAsSubscriber: subsInRes.data ?? [],
      subscriptionsAsCreator: subsOutRes.data ?? [],
      counts: {
        publications: pubsRes.count ?? 0,
        stories: storiesRes.count ?? 0,
        lives: livesRes.count ?? 0,
      },
      withdrawals: withdrawalsRes.data ?? [],
      reportsMade: reportsRes.data ?? [],
    };
  });

function creatorProfilesOr(data: any) {
  return (data ?? []) as any[];
}
