import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb } from "@/lib/admin-db";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

export type BlockedWalletDTO = {
  userId: string;
  username: string | null;
  balanceCents: number;
  debtCents: number;
  blockedAt: string | null;
  blockedReason: string | null;
  reviewedAt: string | null;
};

/** Carteiras bloqueadas ou com dívida por estorno/chargeback de recarga. */
export const listBlockedWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlockedWalletDTO[]> => {
    await assertAdmin(context.supabase, context.userId);
    const db = await adminDb();
    const { data, error } = await db
      .from("subscriber_wallets")
      .select("user_id, balance_cents, debt_cents, blocked_at, blocked_reason, reviewed_at")
      .or("blocked_at.not.is.null,debt_cents.gt.0")
      .order("blocked_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: any) => r.user_id);
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await db.from("profiles").select("user_id, username").in("user_id", ids);
      for (const p of profs ?? []) names.set(p.user_id, p.username);
    }
    return (data ?? []).map((r: any) => ({
      userId: r.user_id,
      username: names.get(r.user_id) ?? null,
      balanceCents: Number(r.balance_cents ?? 0),
      debtCents: Number(r.debt_cents ?? 0),
      blockedAt: r.blocked_at,
      blockedReason: r.blocked_reason,
      reviewedAt: r.reviewed_at,
    }));
  });

export const unblockWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; note: string }) => {
    if (!d?.userId) throw new Error("usuário obrigatório");
    if (!d?.note?.trim()) throw new Error("observação obrigatória");
    return { userId: d.userId, note: d.note.trim().slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("admin_unblock_wallet", {
      _user_id: data.userId,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
