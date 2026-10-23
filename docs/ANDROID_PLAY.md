# Android client & Google Play — Masjid Amanah

The mobile app is an **Expo / React Native** client under `mobile/`.  
It authenticates with Supabase **anon** key + user session and calls the **same backend rules** (RLS + server RPCs).  
**Accounting engine logic is not reimplemented on device.**

## Architecture

```
Mobile (Expo) → Supabase Auth (session) → Postgres RLS / RPCs
             ↘ Optional HTTPS calls to Next.js BFF routes (anon/session cookies not shared)
```

- **Allowed on device:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`  
- **Forbidden on device:** `SUPABASE_SERVICE_ROLE_KEY`, any DB password, webhook secrets  

## Secure session handling

- Use `@supabase/supabase-js` with **SecureStore** (Expo) for session persistence — not plain AsyncStorage for tokens in production builds.  
- Support sign-out that clears local session.  
- Deep links: `masjidamanah://auth/callback` (configure in Supabase redirect URLs and `app.json` scheme).  
- Certificate pinning is optional hardening (not required for RC1).

## Bangla UI

- Default locale `bn`; optional `en`.  
- Large touch targets; loading and error states on every network screen.  
- System font stack that supports Bengali on Android.

## Target API / build

Configure in `mobile/app.json` / `app.config.ts`:

- `android.package` — reverse-DNS app id (replace before store upload)  
- `android.versionCode` / `runtimeVersion`  
- **targetSdkVersion** — set to the **current Play requirement** at build time (check [Play Console / Android docs](https://developer.android.com/google/play/requirements/target-sdk); update when Google raises the floor)  
- Produce **AAB** (Android App Bundle), not only APK, for Play upload  

### Signed AAB (when prerequisites met)

```bash
cd mobile
npx expo prebuild --platform android   # if using dev client / bare workflow as chosen
# Configure keystore via EAS or local:
# eas build -p android --profile production
# OR gradle bundleRelease with upload keystore
```

**Do not commit keystores or upload keys.** Store them in EAS secrets or an HSM/secret manager.

This repository **does not** run Play upload automatically.

## Play Console checklist (human)

| Item | Notes |
|------|--------|
| Testing track | Internal testing → closed → production |
| Privacy policy URL | Required; host a policy covering mosque financial data & auth |
| Data safety form | Declare collected data (email/phone, financial ops metadata), purpose, encryption in transit |
| Permissions | Prefer zero sensitive permissions; justify any storage/camera if receipts photos added later |
| Screenshots | Phone + seven-inch if applicable; Bangla UI preferred |
| Feature graphic | 1024×500 |
| Content rating | Complete IARC questionnaire |
| Target audience | Not designed for children; declare appropriately |
| Login credentials | Provide review account for Play review |
| Financial features | Disclose; no real-money gambling; mosque accounting only |

## Privacy / Data safety (summary for operators)

Declare at least:

- Account identifiers (email/phone) for authentication  
- User-generated financial records associated with the mosque tenant  
- Crash logs if using Sentry  

Do **not** claim “no data collected” if Auth and Supabase are used.

## Unresolved before first store submission

See `docs/RELEASE_CANDIDATE.md` — mobile is an RC scaffold until E2E against staging and Play policy review are complete.
