# Operations — monitoring, backups, recovery

## Monitoring & error reporting

### Recommended setup (not auto-provisioned)

1. **Uptime** — HTTP checks on `/` and `/m/<known-slug>` every 1–5 minutes.  
2. **Error reporting** — Sentry (or equivalent) via `SENTRY_DSN` on the server.  
3. **Supabase** — enable project health alerts (DB CPU, disk, auth errors).  
4. **Logs** — retain application logs ≥ 30 days; restrict access to operators.

### What to alert on

- 5xx rate spike  
- Auth failure spike (possible attack)  
- Migration job failure  
- Backup job failure  
- Disk > 80% on Postgres

## Backups

### Database

| Item | Guidance |
|------|----------|
| Method | Provider PITR (Supabase Pro) **and/or** nightly `pg_dump` to object storage |
| Frequency | Continuous PITR + daily logical dump |
| Retention | ≥ 30 days daily; longer for monthly archives |
| Encryption | At rest via bucket KMS / provider default |
| Test | **Monthly restore drill** to a scratch database |

### Example logical backup (operator)

```bash
# Secrets via env — do not log the URL
pg_dump "$DATABASE_URL" --format=custom -f "masjid-$(date -u +%Y%m%dT%H%M%SZ).dump"
# Upload to restricted bucket; verify checksum
```

### Application

Immutable deploy artifacts (container image or platform deployment ID). Config/secrets only in secret manager.

## Recovery procedures

### RTO / RPO targets (initial — adjust with stakeholders)

| Metric | Initial target | Status |
|--------|----------------|--------|
| RPO (data loss) | ≤ 24 hours (daily dump) or ≤ minutes (PITR) | **Not verified in CI** |
| RTO (restore service) | ≤ 8 hours | **Not verified** |

### Database restore (outline)

1. Declare incident; stop writes if corruption suspected.  
2. Provision scratch or replace primary per host runbook.  
3. Restore dump or PITR to timestamp.  
4. Run `./scripts/test-rls.sh` against restored DB if feasible.  
5. Point app `DATABASE_URL` / Supabase at restored instance.  
6. Smoke-test auth + one journal post on staging clone before prod cutover.  
7. Post-incident: document gap and improve backup job.

### Application rollback

Redeploy previous known-good release; keep DB compatible (forward-only migrations preferred).

## On-call

Maintain a contact list for mosque-facing incidents (outage, suspected data leak). This repository does not define legal notification duties.
