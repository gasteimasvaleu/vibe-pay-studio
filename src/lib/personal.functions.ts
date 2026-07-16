import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type PersonalProfile = {
  cpf: string | null;
  full_name: string | null;
  birth_date: string | null;
  nickname: string | null;
  phone: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
};

export const getPersonalProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonalProfile> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "cpf, full_name, birth_date, nickname, phone, address_cep, address_street, address_number, address_complement, address_district, address_city, address_state",
      )
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (
      data ?? {
        cpf: null,
        full_name: null,
        birth_date: null,
        nickname: null,
        phone: null,
        address_cep: null,
        address_street: null,
        address_number: null,
        address_complement: null,
        address_district: null,
        address_city: null,
        address_state: null,
      }
    );
  });

const updateSchema = z.object({
  nickname: z.string().trim().max(60).nullable(),
  phone: z.string().trim().max(30).nullable(),
  address_cep: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  address_street: z.string().trim().min(1).max(200),
  address_number: z.string().trim().min(1).max(20),
  address_complement: z.string().trim().max(100).nullable(),
  address_district: z.string().trim().min(1).max(100),
  address_city: z.string().trim().min(1).max(100),
  address_state: z.enum(BR_STATES),
});

export const updatePersonalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        nickname: data.nickname,
        phone: data.phone,
        address_cep: data.address_cep.replace(/\D/g, ""),
        address_street: data.address_street,
        address_number: data.address_number,
        address_complement: data.address_complement,
        address_district: data.address_district,
        address_city: data.address_city,
        address_state: data.address_state,
      })
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
