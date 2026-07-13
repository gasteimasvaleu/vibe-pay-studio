// Server-only Asaas client. Never import from client code or top-level of .functions.ts files.
// Load inside handlers: const { asaas } = await import("@/lib/asaas.server");

const ASAAS_BASE = "https://api.asaas.com/v3";
const PLATFORM_COMMISSION_PCT = 15;
export const CREATOR_SPLIT_PCT = 100 - PLATFORM_COMMISSION_PCT; // 85

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  return key;
}

async function asaasFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: getApiKey(),
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

export async function getSubaccount(id: string): Promise<AsaasSubaccount> {
  return asaasFetch<AsaasSubaccount>(`/accounts/${id}`);
}

// ---------- Payments (with split) ----------

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO";

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
    description: input.description.slice(0, 500),
    externalReference: input.externalReference,
  };

  if (input.creatorWalletId) {
    body.split = [
      {
        walletId: input.creatorWalletId,
        percentualValue: CREATOR_SPLIT_PCT,
      },
    ];
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
