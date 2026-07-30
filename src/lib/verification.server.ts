export const VERIFICATION_BUCKET = "profile-verification";

export async function assertVerificationAdmin(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("acesso negado");
}

export function safeVerificationName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
}

export function makeVerificationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MTX-${out}`;
}
