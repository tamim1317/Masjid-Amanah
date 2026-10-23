# Masjid Amanah — Android (Expo)

Bangla-first client against the existing Supabase-backed API.

## Rules

- Only `EXPO_PUBLIC_*` anon configuration
- **Never** embed `SUPABASE_SERVICE_ROLE_KEY`
- Do not reimplement accounting; use RPCs (`submit_journal`, `post_journal`, …)

## Setup

```bash
cd mobile
cp .env.example .env
# fill staging anon URL/key
npm install
npx expo start
```

## Production AAB

See `docs/ANDROID_PLAY.md`. Use EAS production profile (`eas.json`) after human approval. Do not submit to Play from CI without approval.
