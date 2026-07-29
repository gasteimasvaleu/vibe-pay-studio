import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UserStatusKind = "online" | "offline" | "in_chat";
export type ClearAfter = "never" | "30m" | "1h" | "4h" | "today" | "week";

export type MyStatus = {
  status: UserStatusKind;
  clearAfterAt: string | null;
};

function computeClearAfterAt(clearAfter: ClearAfter): string | null {
  if (clearAfter === "never") return null;
  const now = new Date();
  switch (clearAfter) {
    case "30m":
      now.setMinutes(now.getMinutes() + 30);
      break;
    case "1h":
      now.setHours(now.getHours() + 1);
      break;
    case "4h":
      now.setHours(now.getHours() + 4);
      break;
    case "today": {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "week":
      now.setDate(now.getDate() + 7);
      break;
  }
  return now.toISOString();
}

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyStatus> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_status")
      .select("status, clear_after_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { status: "online", clearAfterAt: null };

    // Auto-reset if timer expired.
    if (data.clear_after_at && new Date(data.clear_after_at).getTime() <= Date.now()) {
      await supabase
        .from("user_status")
        .update({ status: "online", clear_after_at: null })
        .eq("user_id", userId);
      return { status: "online", clearAfterAt: null };
    }

    return {
      status: (data.status as UserStatusKind) ?? "online",
      clearAfterAt: (data.clear_after_at as string | null) ?? null,
    };
  });

export const setMyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.enum(["online", "offline", "in_chat"]),
        clearAfter: z.enum(["never", "30m", "1h", "4h", "today", "week"]).default("never"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<MyStatus> => {
    const { supabase, userId } = context;
    const clearAfterAt =
      data.status === "online" ? null : computeClearAfterAt(data.clearAfter);
    const { error } = await supabase
      .from("user_status")
      .upsert(
        {
          user_id: userId,
          status: data.status,
          clear_after_at: clearAfterAt,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { status: data.status, clearAfterAt };
  });

export const getUsersStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userIds: z.array(z.string().uuid()).max(200) }).parse(data),
  )
  .handler(async ({ context, data }): Promise<Record<string, UserStatusKind>> => {
    if (data.userIds.length === 0) return {};
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("user_status")
      .select("user_id, status, clear_after_at")
      .in("user_id", data.userIds);
    if (error) throw new Error(error.message);
    const nowMs = Date.now();
    const out: Record<string, UserStatusKind> = {};
    for (const row of rows ?? []) {
      const expired =
        row.clear_after_at && new Date(row.clear_after_at as string).getTime() <= nowMs;
      out[row.user_id as string] = expired
        ? "online"
        : ((row.status as UserStatusKind) ?? "online");
    }
    return out;
  });
