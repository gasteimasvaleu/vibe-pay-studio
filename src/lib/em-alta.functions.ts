import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emptyEmAltaFeed, type EmAltaFeed } from "@/lib/em-alta.types";

export const getEmAltaFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmAltaFeed> => {
    const { supabase } = context;
    const { data, error } = await (supabase as any).rpc("em_alta_feed");
    if (error) throw new Error(error.message);
    return { ...emptyEmAltaFeed, ...((data ?? {}) as Partial<EmAltaFeed>) };
  });
