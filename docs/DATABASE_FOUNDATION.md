# Database foundation — migrations & local development

## Layout

```
supabase/
  migrations/
    20261023000000_auth_stub_for_local.sql
    20261023000001_extensions_and_enums.sql
    20261023000002_core_tables.sql
    20261023000003_rls_helpers.sql
    20261023000004_rls_policies.sql
    20261023000005_updated_at_triggers.sql
    20261023000006_roles_and_grants.sql
  tests/
    01_tenant_isolation.sql
scripts/
  migrate.sh
  test-rls.sh
docker-compose.yml
```

## Tables

| Table | Purpose |
|-------|---------|
| `mosques` | Tenant root (`mosque_id` on all tenant data) |
| `profiles` | App user (`id` = `auth.users.id` on Supabase) |
| `mosque_memberships` | User ↔ mosque + `roles[]` + status |
| `funds` | Restricted/unrestricted funds + `publish_status` |
| `accounts` | Chart of accounts |
| `transactions` | Journal headers (immutable after post; no DELETE for app roles) |
| `transaction_lines` | Double-entry lines (amounts in **poisha** BIGINT) |
| `approvals` | Approval workflow |
| `attachments` | File metadata (path must include mosque id) |
| `audit_logs` | Append-oriented audit |

Tenant ownership is enforced by:
1. Non-null `mosque_id` FKs
2. Triggers ensuring fund/account/line same-mosque integrity
3. **RLS policies** (not application filters alone)

## Money

All monetary columns use `BIGINT` **poisha** (1 BDT = 100 poisha).

## Local development (Docker)

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Wait until healthy
docker compose ps

# 3. Export connection string (local only — not for production)
export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/masjid_amanah

# 4. Apply migrations
chmod +x scripts/migrate.sh scripts/test-rls.sh
./scripts/migrate.sh

# 5. Run isolation tests
./scripts/test-rls.sh
```

Requires `psql` (PostgreSQL client) on the host.

## Supabase project

1. Create a project in the Supabase dashboard.
2. Link CLI: `supabase link --project-ref <ref>`
3. Push migrations: `supabase db push`  
   Or run the same SQL files via the SQL editor in order.
4. Enable Email/Phone auth as needed; ensure `profiles.id` matches `auth.users.id` (trigger to create profile on signup is recommended in a later migration).
5. Use **anon** key in the browser client; use **service_role** only on the server.

## Environment variables (example)

```bash
# Server only — never NEXT_PUBLIC_
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...

# Safe for browser
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Profile bootstrap (production note)

On Supabase, add a trigger (future migration) so `INSERT INTO auth.users` creates `public.profiles`. Until then, the application or a one-off job must insert the profile row after signup. Platform admin flags must only be set via service_role.

## Open follow-ups

- Auth signup → profile trigger
- Balanced journal CHECK (sum debit = sum credit) as constraint/trigger on post
- Receipt numbering sequences per mosque
- Storage bucket policies mirroring `attachments.mosque_id`
