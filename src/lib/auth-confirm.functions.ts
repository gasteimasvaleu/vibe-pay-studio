import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ email: z.string().email().max(320) });

// Limite simples em memória (janela curta) para reduzir enumeração/abuso.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function rateLimited(key: string) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}

/**
 * Verifica se o e-mail informado já teve a confirmação concluída.
 * Retorna somente um booleano — não distingue "não existe" de "não confirmado".
 */
export const checkEmailConfirmed = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => schema.parse(data))
  .handler(async ({ data }): Promise<{ confirmed: boolean }> => {
    const email = data.email.trim().toLowerCase();
    if (rateLimited(email)) return { confirmed: false };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: res, error } = await supabaseAdmin.rpc("is_email_confirmed", {
        _email: email,
      });
      if (error) {
        console.error("[checkEmailConfirmed]", error.message);
        return { confirmed: false };
      }
      return { confirmed: Boolean(res) };
    } catch (err) {
      console.error("[checkEmailConfirmed] threw", err);
      return { confirmed: false };
    }
  });
