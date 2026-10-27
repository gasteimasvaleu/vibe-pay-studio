/**
 * Resolves creator identity (username, display name, avatar) from a set of
 * creator_profile_ids. Falls back to the user's `profiles` row for legacy rows
 * that don't have `creator_profile_id` set.
 *
 * Used by feed, stories, and other display surfaces so that a creator who is
 * currently viewing their app in "free" mode still shows the correct identity
 * for content that was published under a specific profile (paid vs free).
 */
export type CreatorIdentity = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  kind: "paid" | "free" | null;
};

type MinimalClient = {
  from: (table: string) => any;
};

export async function resolveCreatorIdentities(
  supabase: MinimalClient,
  input: {
    creatorProfileIds: Array<string | null | undefined>;
    userIds: Array<string | null | undefined>;
  },
): Promise<{
  byCreatorProfileId: Map<string, CreatorIdentity>;
  byUserId: Map<string, CreatorIdentity>;
}> {
  const cpIds = Array.from(
    new Set(input.creatorProfileIds.filter((v): v is string => !!v)),
  );
  const userIds = Array.from(
    new Set(input.userIds.filter((v): v is string => !!v)),
  );

  const [cpRes, profRes] = await Promise.all([
    cpIds.length > 0
      ? supabase
          .from("creator_profiles")
          .select("id, user_id, kind, username, display_name, avatar_url")
          .in("id", cpIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? supabase
          .from("profiles_public")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const byCreatorProfileId = new Map<string, CreatorIdentity>();
  for (const row of (cpRes.data ?? []) as any[]) {
    byCreatorProfileId.set(row.id, {
      username: row.username ?? null,
      display_name: row.display_name ?? null,
      avatar_url: row.avatar_url ?? null,
      kind: (row.kind ?? null) as "paid" | "free" | null,
    });
  }

  const byUserId = new Map<string, CreatorIdentity>();
  for (const row of (profRes.data ?? []) as any[]) {
    byUserId.set(row.user_id, {
      username: row.username ?? null,
      display_name: row.display_name ?? null,
      avatar_url: row.avatar_url ?? null,
      kind: null,
    });
  }

  return { byCreatorProfileId, byUserId };
}

export function pickIdentity(
  maps: {
    byCreatorProfileId: Map<string, CreatorIdentity>;
    byUserId: Map<string, CreatorIdentity>;
  },
  row: { creator_profile_id?: string | null; user_id?: string | null },
): CreatorIdentity {
  if (row.creator_profile_id) {
    const hit = maps.byCreatorProfileId.get(row.creator_profile_id);
    if (hit) return hit;
  }
  if (row.user_id) {
    const hit = maps.byUserId.get(row.user_id);
    if (hit) return hit;
  }
  return { username: null, display_name: null, avatar_url: null, kind: null };
}
