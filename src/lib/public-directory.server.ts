import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicCreator = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  price_monthly: number | null;
  kind: string;
  updated_at: string;
};

/** Cliente com a chave pública (sem sessão) para leituras abertas. */
export function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function fetchDirectory(search: string | null, limit: number, offset: number) {
  const sb = publicClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any).rpc("public_creator_directory", {
    _search: search,
    _limit: limit,
    _offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicCreator[]).map((r) => ({
    ...r,
    price_monthly: r.price_monthly != null ? Number(r.price_monthly) : null,
  }));
}
