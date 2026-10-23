import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "./env";

/**
 * Server Supabase client bound to the user's cookie session (anon key + JWT).
 * Use for SSR and Server Actions. RLS still applies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase public config is not set");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only —
          // middleware will refresh the session instead.
        }
      },
    },
  });
}
