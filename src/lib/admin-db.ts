/** Server-only: returns the service-role client. Call only inside server handlers after validating the caller. */
export async function adminDb(): Promise<any> {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}
