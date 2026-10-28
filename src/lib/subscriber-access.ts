// Regra de acesso de posts "só para assinantes" (espelha can_see_publication no banco).

export type SubscriptionRow = {
  creator_id: string;
  creator_profile_id: string | null;
  status: string;
  current_period_end: string | null;
};

/** Chaves de acesso: "creatorId" (assinatura sem perfil) ou "creatorId:profileId". */
export function buildSubscribedKeys(rows: SubscriptionRow[], now: Date = new Date()): Set<string> {
  const keys = new Set<string>();
  for (const r of rows) {
    if (r.status !== "active") continue;
    if (!r.current_period_end || new Date(r.current_period_end).getTime() <= now.getTime()) continue;
    keys.add(r.creator_profile_id ? `${r.creator_id}:${r.creator_profile_id}` : r.creator_id);
  }
  return keys;
}

export function isSubscribedTo(
  keys: Set<string>,
  post: { author_id: string; creator_profile_id?: string | null },
): boolean {
  if (keys.has(post.author_id)) return true;
  if (!post.creator_profile_id) {
    for (const k of keys) if (k.startsWith(`${post.author_id}:`)) return true;
    return false;
  }
  return keys.has(`${post.author_id}:${post.creator_profile_id}`);
}
