import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEmailConfirmationStatus } from "@/lib/auth-confirm.server";

/**
 * Verifica se o e-mail informado já teve a confirmação concluída.
 * Retorna somente um booleano — não distingue "não existe" de "não confirmado".
 */
export const checkEmailConfirmed = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) =>
    z.object({ email: z.string().email().max(320) }).parse(data),
  )
  .handler(async ({ data }): Promise<{ confirmed: boolean }> => ({
    confirmed: await getEmailConfirmationStatus(data.email),
  }));
