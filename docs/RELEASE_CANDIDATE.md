# Release candidate — Masjid Amanah

**Candidate ID:** `RC-2026-10-23`  
**Web version:** `0.1.0` (package.json)  
**Mobile:** Expo scaffold `mobile/` (not store-published)  
**Status:** Ready for **human approval** after operator verification — **not** auto-published.

---

## 1. What’s in this RC

### Web

- Multi-tenant schema + RLS migrations through `00010`
- Auth, memberships, accounting RPCs, public reporting
- Security headers, rate limit on memberships API
- Deployment / ops / environment documentation

### Android

- Expo app skeleton with Bangla-first screens, secure session placeholder, deep link scheme
- Explicit **no service role** configuration
- Play Console documentation (`docs/ANDROID_PLAY.md`)

---

## 2. Test report template (operator fills)

| Suite | Command | Result (pass/fail) | Date | Operator |
|-------|---------|-------------------|------|----------|
| Typecheck | `npm run typecheck` | | | |
| Lint | `npm run lint` | | | |
| Unit / workflow | `npm test` | | | |
| Production build | `npm run build` | | | |
| DB migrations | `./scripts/migrate.sh` | | | |
| RLS + accounting + public + attachments | `./scripts/test-rls.sh` | | | |
| Staging smoke: public pages | Manual | | | |
| Staging smoke: login / logout | Manual | | | |
| Staging smoke: journal approve/post | Manual | | | |
| Staging smoke: cross-tenant denial | Manual | | | |
| Mobile: login against staging | Manual / Expo | | | |

**SQL tests are authoritative for RLS and posting; unit tests do not replace them.**

---

## 3. Deployment steps (summary)

1. Configure staging secrets (`docs/ENVIRONMENTS.md`).  
2. Migrate + `test-rls` on staging (`docs/DEPLOYMENT.md`).  
3. Deploy web to staging; run smoke tests.  
4. Backup production; migrate production; deploy web.  
5. Post-deploy verification table in `DEPLOYMENT.md`.  
6. Mobile: internal testing build via EAS only after staging API stable.  
7. **Stop.** Await human approval before production traffic or Play production track.

---

## 4. Unresolved issues (blockers vs non-blockers)

### Blockers for real mosque money / personal data

| ID | Issue |
|----|--------|
| B1 | Backup/restore **not drilled** on the target production project |
| B2 | File upload / signed download / malware scanning **not implemented** |
| B3 | Operator has not recorded passing `./scripts/test-rls.sh` on target DB |
| B4 | Service-role operational controls (who can access) not signed off |
| B5 | Privacy policy URL and legal review for Play / web not completed |

### Non-blockers for limited staging pilot (synthetic data only)

| ID | Issue |
|----|--------|
| N1 | Distributed rate limiting (edge) not configured |
| N2 | Bill payment full RPC lifecycle incomplete |
| N3 | CSP still allows unsafe-inline/eval (Next.js) |
| N4 | Browser E2E (Playwright) not in CI |
| N5 | MFA not mandatory for treasurers |
| N6 | Mobile AAB not signed in this repo (requires keystore / EAS) |
| N7 | Play Data safety / content rating forms not submitted |
| N8 | Bangla PDF full glyph embedding needs `NotoSansBengali` font asset |

---

## 5. Explicit non-actions

- No production publish from CI in this repository  
- No Google Play upload script that runs without human approval  
- No claim of SOC2 / ISO / “fully secure” status  

---

## 6. Approval

| Role | Approve RC for staging pilot (synthetic data) | Approve production money data | Date |
|------|-----------------------------------------------|-------------------------------|------|
| Engineering | | | |
| Product | | | |
| Ops | | | |

Only after **production money data** approval and blockers B1–B5 closed should real mosque financial data be stored.
