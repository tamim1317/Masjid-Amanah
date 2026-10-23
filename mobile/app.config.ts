import type { ExpoConfig } from "expo/config";

/**
 * targetSdkVersion: set to Google Play's current required level at build time.
 * Verify before each store submission — requirements change.
 * @see https://developer.android.com/google/play/requirements/target-sdk
 */
const PLAY_TARGET_SDK = 35;

const config: ExpoConfig = {
  name: "Masjid Amanah",
  slug: "masjid-amanah",
  version: "0.1.0",
  scheme: "masjidamanah",
  orientation: "portrait",
  userInterfaceStyle: "light",
  android: {
    package: "com.masjidamanah.app",
    versionCode: 1,
    permissions: [],
    // Applied when using prebuild / dev client
    // @ts-expect-error expo config android targetSdkVersion via gradle in bare/prebuild
    targetSdkVersion: PLAY_TARGET_SDK,
  },
  plugins: ["expo-router", "expo-secure-store"],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
};

export default config;
