# Environments — staging & production

Never commit real secrets. Values below are **names and purpose only**.

## Environment matrix

| Variable | Staging | Production | Client? | Notes |
|----------|---------|------------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase project URL | Prod Supabase project URL | Yes | Separate projects recommended |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Prod anon key | Yes | RLS still applies |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.example.com` | `https://app.example.com` | Yes | Auth redirects, emails |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role | Prod service role | **No** | Server only |
| `DATABASE_URL` | Staging Postgres (or pooler) | Prod Postgres (or pooler) | **No** | Migrations, ops |
| `SENTRY_DSN` | Staging DSN (optional) | Prod DSN | Server / optional public | Error reporting |
| `LOG_LEVEL` | `debug` or `info` | `info` or `warn` | Server | |

### Optional (when configured)

| Variable | Purpose |
|----------|---------|
| `SMTP_*` / provider keys | Transactional email (invites, recovery) — via Supabase Auth or provider |
| `BACKUP_BUCKET` | Object storage for logical dumps (ops automation) |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile (same as public web URL for that environment) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile anon key only |
| `EXPO_PUBLIC_API_BASE_URL` | Web app origin for any BFF routes, e.g. `https://app.example.com` |

## Separation rules

1. **Staging and production use different Supabase projects** (or clearly isolated schemas + keys).  
2. **Never** copy production `SUPABASE_SERVICE_ROLE_KEY` into staging mobile or web client bundles.  
3. Mobile may only use `EXPO_PUBLIC_*` variables that map to **anon** credentials.  
4. Auth redirect allowlists in Supabase Dashboard must list each environment’s `SITE_URL` and deep-link schemes.

## Local (developer)

See root `.env.example`. Local Docker Postgres is for migrations/RLS tests only — not a production data store.
