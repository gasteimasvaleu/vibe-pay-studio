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

export const getEmAltaSection = createServerFn({ method: "GET" })
  .inputValidator((data: { section: string; offset?: number; limit?: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<unknown[]> => {
    const { supabase } = context;
    const { data: rows, error } = await (supabase as any).rpc("em_alta_section", {
      _section: data.section,
      _limit: data.limit ?? 24,
      _offset: data.offset ?? 0,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown[];
  });
