# Masjid Amanah — Row Level Security Policy Catalog

**Version:** 0.1  
**Status:** Implemented in `supabase/migrations/20261023000004_rls_policies.sql`  

This document describes every RLS policy. Policies are **deny-by-default**: if no policy matches, access is denied. There are **no** permissive open policies for production.

## Roles

| DB role | Use |
|---------|-----|
| `anon` | Unauthenticated browser / public API |
| `authenticated` | Logged-in user (JWT `sub` = `profiles.id`) |
| `service_role` | Server-only privileged access (**BYPASSRLS**). Never ship this key to the browser. |

Application JWT must set `auth.uid()` via Supabase Auth (or local stub `request.jwt.claim.sub`).

## Helper functions (`SECURITY DEFINER`)

| Function | Purpose |
|----------|---------|
| `current_user_id()` | `auth.uid()` |
| `is_platform_admin()` | `profiles.is_platform_admin` for current user |
| `is_mosque_member(mosque_id)` | Active membership |
| `has_mosque_role(mosque_id, VARIADIC roles)` | Active membership ∩ roles |
| `is_mosque_admin` / `can_manage_accounting` / `can_approve` / `can_view_financials` | Role convenience |
| `is_mosque_publicly_visible(mosque_id)` | `status = active` AND `public_profile_enabled` |

## Policy matrix (summary)

### `mosques`
| Policy | Command | Role | Rule |
|--------|---------|------|------|
| `mosques_select_public` | SELECT | anon, authenticated | active + public_profile_enabled |
| `mosques_select_member` | SELECT | authenticated | member OR platform admin |
| `mosques_insert_platform` | INSERT | authenticated | platform admin |
| `mosques_update_admin_or_platform` | UPDATE | authenticated | mosque admin OR platform admin |
| `mosques_delete_platform` | DELETE | authenticated | platform admin |

### `profiles`
| Policy | Command | Rule |
|--------|---------|------|
| `profiles_select_self_or_platform` | SELECT | self OR platform admin |
| `profiles_select_same_mosque` | SELECT | shares active membership |
| `profiles_update_self` | UPDATE | self; cannot self-elevate `is_platform_admin` |
| `profiles_insert_self` | INSERT | self; `is_platform_admin = false` |

### `mosque_memberships`
| Policy | Command | Rule |
|--------|---------|------|
| `memberships_select_member_or_platform` | SELECT | member of mosque OR self row OR platform admin |
| `memberships_insert_admin` | INSERT | mosque admin OR platform admin |
| `memberships_update_admin` | UPDATE | mosque admin OR platform admin |
| `memberships_delete_admin` | DELETE | mosque admin OR platform admin |

### `funds`
| Policy | Command | Rule |
|--------|---------|------|
| `funds_select_public_published` | SELECT | `publish_status = published` AND mosque publicly visible |
| `funds_select_member_financial` | SELECT | can_view_financials OR platform admin |
| `funds_insert_admin` / `update` / `delete` | write | mosque admin only |

### `accounts`
| Policy | Command | Rule |
|--------|---------|------|
| `accounts_select_financial` | SELECT | can_view_financials OR platform admin |
| `accounts_*_admin` | write | mosque admin; delete blocked if `is_system` |

**No anon SELECT** on accounts.

### `transactions` / `transaction_lines`
| Policy | Command | Rule |
|--------|---------|------|
| `*_select_public_published` | SELECT | published + posted + public mosque |
| `*_select_financial` | SELECT | can_view_financials OR platform admin |
| `*_insert/update_accounting` | write | can_manage_accounting (admin, treasurer) |
| DELETE | — | **No policy → denied** for `authenticated` |

### `approvals`
| Policy | Command | Rule |
|--------|---------|------|
| `approvals_select_relevant` | SELECT | can_approve OR can_manage_accounting OR requester OR platform admin |
| `approvals_insert_accounting` | INSERT | can_manage_accounting |
| `approvals_update_approver` | UPDATE | can_approve OR platform admin |

**No anon access.**

### `attachments`
| Policy | Command | Rule |
|--------|---------|------|
| `attachments_select_member` | SELECT | mosque member OR platform admin |
| `attachments_insert_member` | INSERT | mosque member |
| `attachments_delete_admin` | DELETE | mosque admin OR uploader |

### `audit_logs`
| Policy | Command | Rule |
|--------|---------|------|
| `audit_logs_select_admin` | SELECT | mosque admin OR platform admin |
| `audit_logs_select_financial_readonly` | SELECT | treasurer, approver, committee |
| `audit_logs_insert_member` | INSERT | member + `actor_user_id = auth.uid()` OR platform admin |
| UPDATE/DELETE | — | **No policy → denied** |

## Public surface (explicit)

Anonymous users may only see:
1. Active mosques with `public_profile_enabled`
2. Funds with `publish_status = published` on those mosques
3. Transactions/lines with `publish_status = published` AND `status = posted` on those mosques

Everything else is denied without a matching policy.

## Server credentials

| Secret | Allowed location |
|--------|------------------|
| `service_role` key / DB URL with BYPASSRLS | Server env only (Edge Functions, backend workers) |
| `anon` key | Browser OK (RLS enforced) |
| `authenticated` user JWT | Browser after login |

Never put `service_role` or the Postgres superuser password in Next.js `NEXT_PUBLIC_*` variables.

## Verification

```bash
./scripts/migrate.sh
./scripts/test-rls.sh
```

Test file: `supabase/tests/01_tenant_isolation.sql` — proves Mosque A user cannot read/write Mosque B data, and anon cannot see draft/unpublished financial rows.
