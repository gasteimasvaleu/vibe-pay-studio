import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

const MISSING_ENV_MESSAGE =
  "Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em Project Settings → Environment Variables.";

function createRealClient(): SupabaseClient {
  return createClient(supabaseUrl as string, supabasePublishableKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}

function createStubClient(): SupabaseClient {
  const throwMissing = () => {
    throw new Error(MISSING_ENV_MESSAGE);
  };
  // Proxy that never breaks on import/property access but throws on any real call.
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Allow common introspection without throwing.
      if (prop === "then" || prop === Symbol.toPrimitive) return undefined;
      // Any property access returns another proxy so chained access like
      // supabase.auth.signInWithPassword() throws only when finally invoked.
      return new Proxy(throwMissing, handler);
    },
    apply() {
      throwMissing();
    },
  };
  return new Proxy(throwMissing, handler) as unknown as SupabaseClient;
}

const isConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isConfigured && typeof window !== "undefined") {
  console.warn(`[supabase] ${MISSING_ENV_MESSAGE}`);
}

export const supabase: SupabaseClient = isConfigured
  ? createRealClient()
  : createStubClient();
