// Server-only Asaas client. Never import from client code or top-level of .functions.ts files.
// Load inside handlers: const { asaas } = await import("@/lib/asaas.server");

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ASAAS_BASE = "https://api.asaas.com/v3";
export const PLATFORM_COMMISSION_PCT = 15;
export const CREATOR_SPLIT_PCT = 100 - PLATFORM_COMMISSION_PCT; // 85

// Tarifas cobradas pelo Asaas (valores padrão, sem promocional).
// Descontadas 100% do valor líquido do creator via split fixedValue.
import { PAYMENT_MIN_GROSS_CENTS, type AsaasPaymentMethod } from "@/lib/payment-limits";

export type AsaasBillingMethod = AsaasPaymentMethod;

export function computeGatewayFeeCents(
  grossCents: number,
  method: AsaasBillingMethod,
): number {
  if (!grossCents || grossCents <= 0) return 0;
  switch (method) {
    case "PIX":
      return 199; // R$ 1,99
    case "BOLETO":
      return 199; // R$ 1,99
    case "CREDIT_CARD":
      // 2,99% + R$ 0,49 (à vista)
      return Math.ceil(grossCents * 0.0299) + 49;
    default:
      return 0;
  }
}

/**
 * Valida o mínimo por método. Lança `amount_below_minimum:METHOD:CENTS`
 * (parseável pela UI via `translatePaymentError`) quando o valor bruto
 * está abaixo do mínimo aceito.
 */
export function assertMeetsMinimum(
  grossCents: number,
  method: AsaasBillingMethod,
): void {
  const min = PAYMENT_MIN_GROSS_CENTS[method];
  if (grossCents < min) {
    throw new Error(`amount_below_minimum:${method}:${min}`);
  }
}

/**
 * Calcula o valor líquido que deve chegar ao creator após:
 *  - comissão da plataforma (15%)
 *  - taxa do meio de pagamento cobrada pelo Asaas (integralmente descontada do creator)
 * Lança erro se a operação não cobre as taxas ou está abaixo do mínimo do método.
 */
export function computeCreatorNetCents(
  grossCents: number,
  method: AsaasBillingMethod,
): { platformFeeCents: number; gatewayFeeCents: number; netCreatorCents: number } {
  assertMeetsMinimum(grossCents, method);
  const platformFeeCents = Math.floor((grossCents * PLATFORM_COMMISSION_PCT) / 100);
  const gatewayFeeCents = computeGatewayFeeCents(grossCents, method);
  const netCreatorCents = grossCents - platformFeeCents - gatewayFeeCents;
  if (netCreatorCents <= 0) {
    throw new Error(
      "amount_too_low_for_fees: valor muito baixo para cobrir as taxas da plataforma e do meio de pagamento",
    );
  }
  return { platformFeeCents, gatewayFeeCents, netCreatorCents };
}

export function getPlatformApiKey(): string {
  return getApiKey();
}

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  return key;
}

function getEncryptionKey(): Buffer {
  const key = process.env.ASAAS_KEYS_ENCRYPTION_KEY;
  if (!key) throw new Error("ASAAS_KEYS_ENCRYPTION_KEY não configurada");
  return createHash("sha256").update(key).digest();
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("formato de chave criptografada inválido");
  const [ivB64, authTagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

async function asaasFetch<T = any>(
  path: string,
  init: RequestInit = {},
  apiKey?: string,
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "VibePayStudio/1.0 (+https://vibe-pay-studio.lovable.app)",
      access_token: apiKey ?? getApiKey(),
      accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "errors" in body
        ? JSON.stringify((body as any).errors)
        : text) || res.statusText;
    console.error(`[Asaas] ${init.method ?? "GET"} ${path} -> ${res.status}: ${msg}`);
    throw new Error(`Asaas ${res.status}: ${msg}`);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function centsToBrl(cents: number): number {
  return Math.round(cents) / 100;
}

// Sanitiza textos enviados ao Asaas (aparecem na tela do PIX / fatura do cartão).
// Remove termos sensíveis para não expor conteúdo adulto no extrato bancário do pagador.
const ASAAS_FORBIDDEN_PATTERNS: RegExp[] = [
  /\bsex\w*/gi,
  /\bsexy\b/gi,
  /\bsexo\b/gi,
  /\bsexand\w*/gi,
  /\bporn\w*/gi,
  /\bnude\w*/gi,
  /\bnud[ae]z\b/gi,
  /\bxxx\b/gi,
  /\bhot\b/gi,
  /\bfetich\w*/gi,
  /\bputari\w*/gi,
  /\bputa\w*/gi,
  /\bgostos\w*/gi,
  /\bsafad\w*/gi,
  /\btes[aã]o\b/gi,
  /\bpelad\w*/gi,
  /\bnua\b/gi,
  /\bnu\b/gi,
];

export function sanitizeAsaasText(input: string, maxLen = 60): string {
  let out = (input ?? "").normalize("NFC");
  for (const re of ASAAS_FORBIDDEN_PATTERNS) {
    out = out.replace(re, "");
  }
  out = out.replace(/\s+/g, " ").trim();
  if (out.length === 0) out = "MTX";
  return out.slice(0, maxLen);
}

// ---------- Customers ----------

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
};

export async function createCustomer(input: {
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
  mobilePhone?: string | null;
  externalReference?: string | null;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(
  id: string,
  patch: { name?: string; email?: string | null; cpfCnpj?: string | null; mobilePhone?: string | null },
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(`/customers/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** Busca um cliente já existente no Asaas pelo CPF/CNPJ (contas distintas do app com o mesmo CPF compartilham o cliente). */
export async function findCustomerByCpf(
  cpfCnpj: string,
): Promise<AsaasCustomer | null> {
  const clean = (cpfCnpj ?? "").replace(/\D/g, "");
  if (!clean) return null;
  try {
    const res = await asaasFetch<{ data?: AsaasCustomer[] }>(
      `/customers?cpfCnpj=${encodeURIComponent(clean)}&limit=1`,
    );
    return res?.data?.[0] ?? null;
  } catch {
    return null;
  }
}

// ---------- Subaccounts (criadores) ----------

export type AsaasSubaccount = {
  id: string;
  walletId: string;
  accountStatus?: { general?: string } | string;
  name: string;
  email: string;
};

export async function createSubaccount(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate?: string; // yyyy-MM-dd
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
  companyType?: string;
}): Promise<AsaasSubaccount> {
  return asaasFetch<AsaasSubaccount>("/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function findSubaccount(params: {
  email?: string | null;
  cpfCnpj?: string | null;
}): Promise<AsaasSubaccount | null> {
  const tryQuery = async (qs: string) => {
    const res = await asaasFetch<{ data?: AsaasSubaccount[] }>(`/accounts?${qs}`);
    const first = res?.data?.[0];
    return first ?? null;
  };
  if (params.email) {
    const found = await tryQuery(`email=${encodeURIComponent(params.email)}`);
    if (found) return found;
  }
  if (params.cpfCnpj) {
    const clean = params.cpfCnpj.replace(/\D/g, "");
    if (clean) {
      const found = await tryQuery(`cpfCnpj=${encodeURIComponent(clean)}`);
      if (found) return found;
    }
  }
  return null;
}

export async function getSubaccount(id: string): Promise<AsaasSubaccount> {
  return asaasFetch<AsaasSubaccount>(`/accounts/${id}`);
}

// ---------- Account info (using creator API key) ----------

export async function getWalletForApiKey(
  apiKey: string,
): Promise<{ walletId: string }> {
  const body = await asaasFetch<Record<string, unknown>>("/wallets/", {}, apiKey);
  let walletId: unknown = null;
  if (body && typeof body === "object") {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as Record<string, unknown> | null;
      if (first && typeof first === "object") {
        walletId = first.id ?? first.walletId ?? null;
      }
    }
    if (!walletId) {
      walletId =
        (body as { walletId?: unknown }).walletId ??
        (body as { id?: unknown }).id ??
        null;
    }
  }
  if (!walletId || typeof walletId !== "string") {
    throw new Error("não foi possível recuperar o Wallet ID com essa API key");
  }
  return { walletId };
}

let cachedPlatformWalletId: string | null = null;
export async function getPlatformWalletId(): Promise<string | null> {
  if (cachedPlatformWalletId) return cachedPlatformWalletId;
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return null;
    const { walletId } = await getWalletForApiKey(apiKey);
    cachedPlatformWalletId = walletId;
    return walletId;
  } catch {
    return null;
  }
}

// ---------- Payments (with split) ----------

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";

export type AsaasPayment = {
  id: string;
  status: string;
  billingType: AsaasBillingType;
  value: number;
  netValue?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate: string;
  customer: string;
  subscription?: string | null;
  externalReference?: string | null;
};

export type CreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type CreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone?: string;
};

export async function createPayment(input: {
  customerId: string;
  billingType: AsaasBillingType;
  amountCents: number;
  description: string;
  externalReference?: string;
  dueDate?: string; // yyyy-MM-dd
  creatorWalletId?: string | null; // if provided, add split to creator
  netCreatorCents?: number | null; // valor fixo (em cents) que deve ir ao creator
  creditCard?: CreditCardInput;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  remoteIp?: string;
}): Promise<AsaasPayment> {
  const due = input.dueDate ?? new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: centsToBrl(input.amountCents),
    dueDate: due,
    description: sanitizeAsaasText(input.description, 60),
    externalReference: input.externalReference,
  };

  if (input.creatorWalletId) {
    const platformWalletId = await getPlatformWalletId();
    if (!platformWalletId || platformWalletId !== input.creatorWalletId) {
      // Split por valor fixo: garante que o creator absorva 100% da taxa do Asaas
      // (o restante fica na conta principal, cobrindo a comissão e a taxa retida pelo gateway).
      if (input.netCreatorCents == null || input.netCreatorCents <= 0) {
        throw new Error("netCreatorCents obrigatório para split de creator");
      }
      body.split = [
        {
          walletId: input.creatorWalletId,
          fixedValue: centsToBrl(input.netCreatorCents),
        },
      ];
    }
  }

  if (input.billingType === "CREDIT_CARD") {
    if (input.creditCardToken) {
      body.creditCardToken = input.creditCardToken;
    } else if (input.creditCard && input.creditCardHolderInfo) {
      body.creditCard = input.creditCard;
      body.creditCardHolderInfo = input.creditCardHolderInfo;
      if (input.remoteIp) body.remoteIp = input.remoteIp;
    } else {
      throw new Error("Cartão requer creditCardToken ou creditCard+creditCardHolderInfo");
    }
  }

  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type AsaasPixQr = {
  encodedImage: string; // base64 PNG
  payload: string; // copia e cola
  expirationDate?: string;
};

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQr> {
  return asaasFetch<AsaasPixQr>(`/payments/${paymentId}/pixQrCode`);
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function refundPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}/refund`, {
    method: "POST",
  });
}

// ---------- Credit card tokenization ----------

export type AsaasTokenizedCard = {
  creditCardNumber: string; // masked last 4
  creditCardBrand: string;
  creditCardToken: string;
};

export async function tokenizeCreditCard(input: {
  customerId: string;
  creditCard: CreditCardInput;
  creditCardHolderInfo: CreditCardHolderInfo;
  remoteIp?: string;
}): Promise<AsaasTokenizedCard> {
  return asaasFetch<AsaasTokenizedCard>("/creditCard/tokenize", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    }),
  });
}

// ---------- Transfers (using creator API key) ----------

export type AsaasPixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export type AsaasTransfer = {
  id: string;
  status: "PENDING" | "DONE" | "CANCELLED" | string;
  value: number;
  netValue?: number;
  pixAddressKey?: string;
  failReason?: string | null;
  externalReference?: string | null;
};

export async function createPixTransfer(
  apiKey: string,
  input: {
    value: number;
    pixAddressKey: string;
    pixAddressKeyType: AsaasPixKeyType;
    externalReference?: string;
    description?: string;
  },
): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>(
    "/transfers",
    {
      method: "POST",
      body: JSON.stringify({
        value: input.value,
        operationType: "PIX",
        pixAddressKey: input.pixAddressKey,
        pixAddressKeyType: input.pixAddressKeyType,
        externalReference: input.externalReference,
        description: input.description,
      }),
    },
    apiKey,
  );
}

export async function getTransfer(
  apiKey: string,
  transferId: string,
): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>(`/transfers/${transferId}`, {}, apiKey);
}

// ---------- Subscriptions (recurring) ----------

export type AsaasSubscriptionCycle = "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";

export type AsaasSubscription = {
  id: string;
  status: string;
  nextDueDate: string;
  value: number;
  cycle: AsaasSubscriptionCycle;
  customer: string;
  externalReference?: string | null;
  billingType: AsaasBillingType;
};

export async function createAsaasSubscription(input: {
  customerId: string;
  billingType: AsaasBillingType;
  amountCents: number;
  cycle: AsaasSubscriptionCycle;
  nextDueDate: string; // yyyy-MM-dd
  description: string;
  externalReference: string;
  creatorWalletId?: string | null;
  netCreatorCents?: number | null;
  creditCard?: CreditCardInput;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  remoteIp?: string;
}): Promise<AsaasSubscription> {
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: centsToBrl(input.amountCents),
    nextDueDate: input.nextDueDate,
    cycle: input.cycle,
    description: sanitizeAsaasText(input.description, 60),
    externalReference: input.externalReference,
  };

  if (input.creatorWalletId) {
    const platformWalletId = await getPlatformWalletId();
    if (!platformWalletId || platformWalletId !== input.creatorWalletId) {
      if (input.netCreatorCents == null || input.netCreatorCents <= 0) {
        throw new Error("netCreatorCents obrigatório para split de creator");
      }
      body.split = [
        {
          walletId: input.creatorWalletId,
          fixedValue: centsToBrl(input.netCreatorCents),
        },
      ];
    }
  }

  if (input.billingType === "CREDIT_CARD") {
    if (input.creditCardToken) {
      body.creditCardToken = input.creditCardToken;
    } else if (input.creditCard && input.creditCardHolderInfo) {
      body.creditCard = input.creditCard;
      body.creditCardHolderInfo = input.creditCardHolderInfo;
      if (input.remoteIp) body.remoteIp = input.remoteIp;
    }
  }

  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteAsaasSubscription(id: string): Promise<void> {
  await asaasFetch(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function getAsaasSubscription(id: string): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`);
}
