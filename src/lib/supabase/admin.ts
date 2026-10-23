import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Privileged server-only client (service role, bypasses RLS).
 * NEVER import this module from Client Components or expose the key.
 * Use only for: invites hashing verification, platform ops, profile bootstrap.
 */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
