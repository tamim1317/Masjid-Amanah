# Authentication & Authorization

## Overview

Masjid Amanah uses **Supabase Auth** for identity and **Postgres RLS + server-side checks** for authorization. Neither layer alone is sufficient; both must pass.

| Layer | Responsibility |
|-------|----------------|
| Supabase Auth | Sign-in, sign-out, session cookies, password recovery |
| Server Actions / Route Handlers | `requireUser`, `requireMosqueAccess`, role checks before mutations |
| Middleware | Session refresh + coarse `/app` and `/platform` redirects |
| RLS + DB triggers | Tenant isolation, block self-elevation, audit membership changes |

## Roles

**Mosque-scoped** (in `mosque_memberships.roles`):  
`admin` | `treasurer` | `approver` | `committee` | `staff` | `viewer`

**Platform-scoped** (in `profiles.is_platform_admin`):  
Separate flag. Cannot be set via invitation roles or client profile update (DB trigger `guard_platform_admin_elevation`).

## Flows

### Sign-in / sign-out / recovery
- `signInWithPassword`, `signUp`, `signOut`, `requestPasswordRecovery`, `updatePassword` in `src/lib/auth/actions.ts`
- Callback: `/auth/callback`
- UI: `/login`, `/signup`, `/forgot-password`, `/reset-password`

### Invitation
1. Mosque admin calls `inviteMember` (admin role grant requires **re-authentication password**).
2. Token stored as **SHA-256 hash** only.
3. Invitee signs in and opens `/invite?token=…` → `acceptInvitation`.
4. Membership created/activated; invitation marked accepted.

### Suspension / removal
- `suspendMembership` sets `status = revoked` + `revoked_at` (cannot suspend self).
- Revoked members fail `requireMosqueAccess` with `membership_revoked`.

## Least privilege

| Action | Required |
|--------|----------|
| View financial reports | active membership with financial roles |
| Post journals | `admin` or `treasurer` |
| Approve | `admin` or `approver` |
| Invite / change roles / revoke | `admin` |
| Platform tenant list | `is_platform_admin` |

## Escalation protections

1. **Application:** `assertCanAssignRoles` — non-admins cannot assign roles.
2. **Database:** `guard_membership_role_grant` — blocks non-admin from granting `admin` or changing own roles.
3. **Database:** `guard_platform_admin_elevation` — blocks self-grant of platform admin.
4. **Re-auth:** Granting `admin` via invite/role update requires password confirmation.

## Secrets

| Variable | Client? |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — server only** |

## Error messages

`src/lib/auth/errors.ts` maps failures to Bangla (default) / English messages without SQL, stack traces, or key material.

## Tests

```bash
# Pure + mapping tests (no DB)
npm install
npm test

# Database isolation + escalation (requires Postgres + migrations)
docker compose up -d db
export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/masjid_amanah
./scripts/migrate.sh
./scripts/test-rls.sh   # includes 01_tenant_isolation + 02_auth_escalation
```

Authorization is **not** considered complete until both `npm test` and `./scripts/test-rls.sh` pass in your environment.
