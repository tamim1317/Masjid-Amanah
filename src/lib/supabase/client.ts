"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "./env";

/**
 * Browser Supabase client (anon key only).
 * RLS applies to every query made through this client.
 */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase public config is not set");
  }
  return createBrowserClient(url, anonKey);
}
