# Release checklist — Masjid Amanah

Complete every item before enabling real mosque data.  
Items marked **Verify** must be executed and recorded (date + operator).

## A. Build & static quality

- [ ] `npm ci`
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors (or waived with ticket)
- [ ] `npm test` — all unit/workflow tests pass
- [ ] `npm run build` — production build succeeds
- [ ] `npm audit --production` — no unaddressed critical/high (or risk accepted)

## B. Database

- [ ] Migrations applied to staging in order (`00000` … `00010`)
- [ ] `./scripts/test-rls.sh` on staging DB — all suites pass
- [ ] Backup taken before migrate; restore tested to a scratch instance
- [ ] RLS: confirm `FORCE ROW LEVEL SECURITY` on sensitive tables
- [ ] No permissive policies added outside migrations

## C. Auth & tenancy

- [ ] Supabase Auth URL / redirect allowlist correct for the environment
- [ ] Service role key only on server; never in browser or mobile apps
- [ ] Platform admin assigned via controlled break-glass, not self-serve
- [ ] Invitation email/SMS path tested with synthetic users on two tenants
- [ ] Cross-tenant denial confirmed (User A cannot read Mosque B)

## D. Accounting

- [ ] Post / reverse / transfer / period-close tested with synthetic poisha data
- [ ] Published report checksum reconciles (`verify_report_reconciliation`)
- [ ] Month close blocks further posts (tested)
- [ ] Approval threshold + separation of duties tested with two users

## E. Public portal

- [ ] Draft and pending journals absent from public pages
- [ ] Private attachments not listable as anon
- [ ] PDF generates for a published period
- [ ] No phone/email in public JSON responses (spot-check network tab)

## F. Operations

- [ ] Error monitoring (e.g. Sentry) receiving events
- [ ] Log retention and access policy defined
- [ ] Rate limits at edge (CDN/WAF) in addition to app limiter
- [ ] Incident response contact for mosque operators documented
- [ ] Rollback plan for app + DB documented

## G. Explicit non-claims

- [ ] Release notes do **not** claim SOC2, ISO, or legal “compliance”
- [ ] Release notes do **not** claim “production-ready” without checklist sign-off
- [ ] Known gaps from `docs/PRODUCTION_READINESS.md` linked in release notes

**Sign-off**

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product | | |
| Ops / DB | | |
