# Deployment guide — Masjid Amanah (web)

Controlled production deployment. **Do not publish automatically.** Human approval required after the release candidate checks.

## 1. Prerequisites

- Separate **staging** and **production** Supabase projects (recommended)
- Hosting for Next.js (e.g. Vercel, Fly.io, or container on a VPS)
- Custom domain DNS access
- Operator who can run migrations and verify RLS tests

## 2. Environment configuration

1. Create staging secrets in the host’s secret store (not git).  
2. Create production secrets similarly.  
3. Variable names: see `docs/ENVIRONMENTS.md`.  
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` is **server-only** on the host.

## 3. Database migrations (safe apply)

```bash
# From a secure operator workstation — not from the public app container if avoidable
export DATABASE_URL="<staging-or-prod-connection-string>"
./scripts/migrate.sh
./scripts/test-rls.sh   # must pass on a clone or staging before prod
```

### Safety rules

1. **Backup first** (see `docs/OPERATIONS.md`).  
2. Apply to **staging**, run full test-rls + smoke tests.  
3. Apply the **same migration files** to production during a maintenance window.  
4. Never run ad-hoc SQL that bypasses versioned migrations on production.  
5. If a migration fails mid-way, stop and restore from backup; do not “fix forward” without review.

`scripts/migrate.sh` applies files in `supabase/migrations/` in lexical order.

## 4. Application deploy

### Build

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start   # or platform-specific start command
```

### Hosting notes

- Set all env vars before build if the platform inlines `NEXT_PUBLIC_*` at build time.  
- Enable HTTPS only (redirect HTTP → HTTPS).  
- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.

## 5. Custom domain & HTTPS

1. Point DNS `A`/`CNAME` to the hosting provider.  
2. Issue TLS certificate (Let’s Encrypt or provider-managed).  
3. In Supabase Auth settings, add:
   - Site URL = production origin  
   - Redirect URLs = `https://<domain>/auth/callback`, password reset paths  
4. HSTS can be enabled at the edge after confirming HTTPS works end-to-end.

## 6. Post-deploy verification (mandatory)

| Check | How |
|-------|-----|
| Public mosque page loads | `GET /m/<slug>` |
| Public finance shows only published data | `GET /m/<slug>/reports/public` |
| Unauthenticated `/app` redirects to login | Browser |
| Login + session cookie | Staging test user |
| Cross-tenant denial | User of mosque A cannot open mosque B data |
| RLS suite | `./scripts/test-rls.sh` against deployed DB (or staging twin) |
| Journal submit → approve → post | Two synthetic users |
| Service role not in browser | View page source / network; no `service_role` string |

Record results in `docs/RELEASE_CANDIDATE.md` test report section.

## 7. Rollback

1. Revert application deployment to previous immutable release.  
2. Database: restore from pre-migrate backup if schema change is unsafe to leave.  
3. Do not re-apply partial migrations without a written plan.

## 8. What this guide does **not** do

- Automatic production publish  
- Automatic Play Store upload  
- Legal compliance certification  
