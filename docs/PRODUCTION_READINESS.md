# Production-readiness review — Masjid Amanah

**Date:** 2026-10-23  
**Scope:** Code and SQL in this repository only. No external penetration test, no legal compliance certification.

**Verdict:** Not production-ready for handling real mosque funds or personal data without completing the **Release checklist** and closing items marked **Gap** / **Untested**.

---

## 1. Tenant isolation and RLS

| Control | Status | Evidence |
|---------|--------|----------|
| FORCE RLS on core tables | Present in migrations | `00004`, `00009`, `00010` |
| Deny-by-default for anon on private tables | Present | No open `USING (true)` policies found |
| Cross-tenant SQL tests | Written | `01_tenant_isolation.sql` |
| Cross-tenant tests **executed in CI** | **Untested here** | Requires Postgres + `./scripts/test-rls.sh` |
| App filters without RLS | Avoided for core data | RLS is primary; app also checks roles |

**Gaps:** Service-role client bypasses RLS by design (`acceptInvitation`). Misuse of service role in new code is a high risk. No automated scan that client bundles exclude service role key.

---

## 2. Authentication and authorization

| Control | Status | Evidence |
|---------|--------|----------|
| Sign-in / recovery / session cookies | Implemented | `actions.ts`, middleware, SSR client |
| Server gates on `/app` and `/platform` | Implemented | `guard-boundary.tsx` |
| Role escalation blocked in app + DB | Implemented | `assertCanAssignRoles`, triggers in `00007` |
| Separation of duties (accounting) | Implemented | SQL in `00008` |
| Re-auth for admin grant | Implemented | Password re-check in invite/role update |
| Auth unit tests | Written | `tests/auth/*` |
| Live Supabase auth E2E | **Untested** | Needs project + email provider |

**Gaps:** No MFA/AAL2 enforcement. Middleware alone is not authorization. Platform admin bootstrap process not documented as a controlled break-glass procedure.

---

## 3. Financial posting and reconciliation

| Control | Status | Evidence |
|---------|--------|----------|
| Integer poisha only | Present | Schema + `assertLinesBalanced` |
| Balanced journal required | Present | `assert_journal_balanced` |
| Atomic post (`FOR UPDATE`) | Present | `post_journal` |
| Posted immutability | Present | Triggers |
| Controlled reversal | Present | `reverse_journal` |
| Idempotency keys | Present | Unique indexes |
| Accounting SQL tests | Written | `03_accounting_engine.sql` |
| Concurrent post under load | **Partial** | Idempotent re-post tested; not multi-session race harness |
| Bill payment full lifecycle RPC | **Gap** | Tables exist; end-to-end bill→payment→journal incomplete |

---

## 4. File upload and access

| Control | Status | Evidence |
|---------|--------|----------|
| Path must start with `mosque_id/` | Present | Constraint in `00010` + `assertSafeStoragePath` |
| Public list only `is_public` | Present | Policy + `public_attachments_for_entity` |
| SQL attachment tests | Written | `05_attachment_access.sql` |
| Actual Storage upload API + signed URLs | **Gap** | Not implemented |
| Virus/malware scanning | **Gap** | Not implemented |
| Max size / MIME allowlist server-side | **Gap** | Not implemented |

---

## 5. Input validation, rate limiting, errors

| Control | Status | Evidence |
|---------|--------|----------|
| UUID / poisha / path validators | Present | `src/lib/security/validate.ts` |
| Bangla-safe auth errors | Present | `errors.ts` |
| In-process rate limit on memberships API | Present | `rate-limit.ts` |
| Global / edge rate limit | **Gap** | Single-process only |
| CSRF for cookie mutations | **Partial** | SameSite cookies via Supabase; no explicit CSRF tokens |

---

## 6. Secrets and environment

| Control | Status | Evidence |
|---------|--------|----------|
| Service role not under `NEXT_PUBLIC_` | By design | `admin.ts` + `env.ts` |
| `.env.example` documents split | Present | `.env.example` |
| Secret scanning in CI | **Gap** | Not configured in repo |
| Runtime denial if service key missing on invite accept | Throws | Requires env in deploy |

---

## 7. Migrations and backup/restore

| Control | Status | Evidence |
|---------|--------|----------|
| Versioned SQL migrations | Present | `supabase/migrations/*` |
| Local migrate script | Present | `scripts/migrate.sh` |
| Documented backup/RPO/RTO | **Gap** | Architecture docs mention need; no runbook with tested restore |
| Point-in-time recovery drill | **Untested** | Not run in this review |

---

## 8. Accessibility and mobile

| Control | Status | Evidence |
|---------|--------|----------|
| Mobile-first layouts / drawers | Present | Admin/public shells |
| Language toggle BN/EN | Present | Locale provider |
| Automated a11y (axe) suite | **Gap** | Not present |
| Full keyboard/screen-reader audit | **Untested** | Manual only |

---

## 9. Dependencies and deployment

| Control | Status | Evidence |
|---------|--------|----------|
| Security response headers | Present | `next.config.ts` |
| CSP (moderate) | Present | Allows `'unsafe-inline'` / `'unsafe-eval'` for Next — tighten later |
| `npm audit` in CI | **Gap** | Not wired |
| Container hardening / non-root | **Gap** | Only local Postgres compose |
| Observability (APM, error tracking) | **Gap** | Not configured |

---

## 10. Test inventory (what exists vs what was run)

### Written in repo

- Unit: auth, accounting balance, reporting PDF/sanitize, security validate/rate-limit  
- SQL integration: isolation, escalation, accounting, public reporting, attachments  
- Workflow: `tests/e2e/critical-workflows.test.ts` (domain-level, not browser)

### Required verification commands (operator must run)

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build

docker compose up -d db
export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/masjid_amanah
./scripts/migrate.sh
./scripts/test-rls.sh
```

**This review environment did not guarantee successful execution of Docker/Postgres or a full Next production build.** Treat all SQL and build results as **operator-verified**.

---

## Remaining risks (priority)

1. **P0** — No verified backup/restore for production Postgres.  
2. **P0** — Service-role usage surface; need strict code owners + lint forbid client imports of `admin.ts`.  
3. **P0** — File storage pipeline incomplete (upload, signed download, malware).  
4. **P1** — Rate limiting not distributed.  
5. **P1** — Bill payment posting path incomplete.  
6. **P1** — CSP still allows unsafe-eval/inline.  
7. **P2** — No automated a11y or browser E2E against live Supabase.  
8. **P2** — MFA not required for treasurers/admins.

Do **not** market this system as “secure”, “audited”, or “production-ready” solely because TypeScript build or unit tests pass.
