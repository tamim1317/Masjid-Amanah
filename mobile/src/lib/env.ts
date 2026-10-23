import Constants from "expo-constants";

/**
 * Public configuration only. SERVICE_ROLE must never appear here or in any mobile module.
 */
export function getMobileConfig() {
  const extra = Constants.expoConfig?.extra ?? {};
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    (extra.supabaseUrl as string | undefined) ??
    "";
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    (extra.supabaseAnonKey as string | undefined) ??
    "";
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (extra.apiBaseUrl as string | undefined) ??
    "";

  if (anonKey && /service_role/i.test(anonKey)) {
    throw new Error("Invalid configuration: service role key is not allowed in the mobile app");
  }

  return { url, anonKey, apiBaseUrl };
}
