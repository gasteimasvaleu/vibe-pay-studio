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

async function authSchema() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  // The generated Database types only cover the public schema; cast to any
  // so we can reach auth.sessions with the service-role client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin as any).schema("auth");
}

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeviceSession[]> => {
    const current = currentSessionId(
      context.claims as Record<string, unknown>,
    );
    const auth = await authSchema();
    const { data, error } = await auth
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
    const auth = await authSchema();
    const { error } = await auth
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
    const auth = await authSchema();
    let q = auth.from("sessions").delete().eq("user_id", context.userId);
    if (current) q = q.neq("id", current);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
