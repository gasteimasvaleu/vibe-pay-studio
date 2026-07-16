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

export type RevokedSession = {
  id: string;
  sessionId: string;
  userAgent: string | null;
  ip: string | null;
  sessionCreatedAt: string | null;
  sessionLastActiveAt: string | null;
  revokedAt: string;
  reason: "user" | "user_all" | string;
};

function currentSessionId(claims: Record<string, unknown>): string | null {
  const v = claims["session_id"];
  return typeof v === "string" ? v : null;
}

type RpcSessionRow = {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
};

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeviceSession[]> => {
    const current = currentSessionId(
      context.claims as Record<string, unknown>,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc(
      "list_my_sessions",
    );
    if (error) throw new Error(error.message);
    return ((data ?? []) as RpcSessionRow[]).map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ip: r.ip,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("revoke_session", {
      p_session_id: data.sessionId,
    });
    if (error) {
      if (error.message?.includes("cannot_revoke_current_session")) {
        throw new Error("Não é possível remover o acesso atual por aqui.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const revokeAllOtherSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc(
      "revoke_all_other_sessions",
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type RpcRevokedRow = {
  id: string;
  session_id: string;
  user_agent: string | null;
  ip: string | null;
  session_created_at: string | null;
  session_last_active_at: string | null;
  revoked_at: string;
  revoked_reason: string;
};

export const listMyRevokedSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RevokedSession[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc(
      "list_my_revoked_sessions",
    );
    if (error) throw new Error(error.message);
    return ((data ?? []) as RpcRevokedRow[]).map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      userAgent: r.user_agent,
      ip: r.ip,
      sessionCreatedAt: r.session_created_at,
      sessionLastActiveAt: r.session_last_active_at,
      revokedAt: r.revoked_at,
      reason: r.revoked_reason,
    }));
  });
