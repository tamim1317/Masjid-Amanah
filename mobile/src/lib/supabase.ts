import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { getMobileConfig } from "./env";

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: ReturnType<typeof createClient> | null = null;

/**
 * Browser-equivalent anon client. All data access is subject to RLS.
 * Do not implement double-entry or posting rules here — call server RPCs only.
 */
export function getSupabase() {
  if (client) return client;
  const { url, anonKey } = getMobileConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured for mobile");
  }
  client = createClient(url, anonKey, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
