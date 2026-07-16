import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DeviceSession = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string | null;
  refreshedAt: string | null;
  isCurrent: boolean;
};

function currentSessionId(claims: Record<string, unknown>): string | null {
  const v = claims["session_id"];
  return typeof v === "string" ? v : null;
}

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeviceSession[]> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const current = currentSessionId(
      context.claims as Record<string, unknown>,
    );
    const { data, error } = await supabaseAdmin
      .schema("auth")
      // @ts-expect-error auth schema is not in generated Database types
      .from("sessions")
      .select("id, created_at, updated_at, refreshed_at, user_agent, ip")
      .eq("user_id", context.userId)
      .order("refreshed_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{
      id: string;
      created_at: string | null;
      updated_at: string | null;
      refreshed_at: string | null;
      user_agent: string | null;
      ip: string | null;
    }>).map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ip: r.ip ? String(r.ip) : null,
      createdAt: r.created_at,
      refreshedAt: r.refreshed_at ?? r.updated_at ?? r.created_at,
      isCurrent: current !== null && r.id === current,
    }));
  });

export const revokeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const current = currentSessionId(
      context.claims as Record<string, unknown>,
    );
    if (current && data.sessionId === current) {
      throw new Error("Não é possível remover o acesso atual por aqui.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .schema("auth")
      // @ts-expect-error auth schema is not in generated Database types
      .from("sessions")
      .delete()
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAllOtherSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const current = currentSessionId(
      context.claims as Record<string, unknown>,
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = supabaseAdmin
      .schema("auth")
      // @ts-expect-error auth schema is not in generated Database types
      .from("sessions")
      .delete()
      .eq("user_id", context.userId);
    if (current) q = q.neq("id", current);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
