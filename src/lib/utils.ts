import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * Normaliza um username vindo de input manual ou de provedores OAuth (Google/Apple):
 * - remove acentos e espaços
 * - mantém apenas letras, números e underscore
 * - lowercase
 * - trunca em USERNAME_MAX caracteres
 */
export function sanitizeUsername(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX);
}
