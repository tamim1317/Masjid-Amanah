# Masjid Amanah

Bangla-first, multi-tenant mosque management SaaS for Bangladesh.

This repository contains the **current** product foundation: product docs, Next.js UI, Supabase/Postgres schema with RLS, authentication/authorization layer, accounting engine (SQL), public financial reporting, digital donation **demo** UI, deployment/ops docs, and an Expo Android client scaffold.

**Not** a claim of production readiness for real mosque funds. See `docs/PRODUCTION_READINESS.md` and `docs/RELEASE_CANDIDATE.md`.

## Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI |
| Auth / DB | Supabase Auth patterns, PostgreSQL, Row Level Security |
| Money | Integer **poisha** only (no floating-point ledger math) |
| Mobile | Expo / React Native scaffold under `mobile/` (anon key only) |
| Tests | Vitest (unit), SQL suites under `supabase/tests/` |

## Prerequisites

- Node.js **20+** and npm
- Optional: Docker (for local Postgres + RLS tests)
- Optional: A Supabase project (for real auth/session against hosted DB)

## 1. Install dependencies

```bash
cd masjid-amanah   # or the extracted folder name
npm install
```

For the mobile app (optional):

```bash
cd mobile
npm install
cd ..
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with **your** values. Never commit real secrets.

| Variable | Required for | Notes |
|----------|--------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth / data | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth / data | Anon key (RLS applies) |
| `NEXT_PUBLIC_SITE_URL` | Auth redirects | e.g. `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Never** `NEXT_PUBLIC_*` |
| `DATABASE_URL` | Migrations / SQL tests | Local Docker or hosted Postgres |

See `docs/ENVIRONMENTS.md`.

## 3. Run the web app locally

```bash
npm run dev
```

Open:

| URL | Purpose |
|-----|---------|
| `/` | Platform landing |
| `/m/al-amanah-dhaka` | Public mosque demo site |
| `/m/al-amanah-dhaka/donate` | Digital donation **demo** (no real payment) |
| `/m/al-amanah-dhaka/reports/public` | Public finance transparency |
| `/login` | Sign-in |
| `/app/dashboard` | Mosque admin (requires auth when Supabase configured) |
| `/platform` | Platform operator (platform admin only) |

Without Supabase env vars, public UI still loads; protected areas redirect to login / show configuration notices.

## 4. Database (optional but required for RLS/accounting tests)

```bash
docker compose up -d db
# Matches docker-compose.yml defaults for local only:
export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/masjid_amanah
./scripts/migrate.sh
./scripts/test-rls.sh
```

Migrations: `supabase/migrations/`. Policy tests: `supabase/tests/`.

## 5. Test, lint, typecheck, build

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Pre-deploy helper (when env is ready):

```bash
./scripts/pre-deploy-check.sh
```

## 6. Mobile (optional)

```bash
cd mobile
cp .env.example .env
# set EXPO_PUBLIC_SUPABASE_* (anon only — never service role)
npx expo start
```

See `docs/ANDROID_PLAY.md`.

## Project structure (high level)

```
docs/                 Product, security, deploy, accounting, donations
src/app/              Next.js routes (public, admin, platform, auth, API)
src/components/       UI, layouts, donations form
src/lib/              Auth, accounting, reporting, donations, security, i18n
supabase/migrations/  Versioned SQL
supabase/tests/       Isolation, auth, accounting, reporting, attachments
mobile/               Expo Android client scaffold
scripts/              migrate, test-rls, pre-deploy-check
tests/                Vitest unit / workflow tests
```

## Documentation index

| Doc | Topic |
|-----|--------|
| `docs/PRD.md` | Product requirements |
| `docs/AUTH.md` | Authentication |
| `docs/ACCOUNTING.md` | Ledger engine |
| `docs/REPORTING.md` | Public transparency |
| `docs/DONATIONS.md` | Donation demo vs production |
| `docs/DEPLOYMENT.md` | Deploy guide |
| `docs/PRODUCTION_READINESS.md` | Honest readiness review |
| `docs/RELEASE_CANDIDATE.md` | RC and blockers |

## Scripts (root `package.json`)

| Script | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Start | `npm run start` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| SQL policy tests | `npm run test:rls` (needs `DATABASE_URL`) |

## Honest limitations

- Digital donations are **demo-only** — no real payment processing.
- File upload/storage pipeline is incomplete.
- Full production readiness requires operator sign-off on the release checklist.
- Do not treat a green local build alone as security certification.
