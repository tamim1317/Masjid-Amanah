# Masjid Amanah — Roles, Permissions & Tenant Isolation

**Version:** 0.1 (Draft for Review)  
**Status:** Pre-implementation  

---

## 1. Tenant Isolation Rules

1. Every authenticated request carries an active `tenant_id` (or is a platform-operator request).
2. Application code must never accept a client-supplied `tenant_id` for data access without verification against the user’s memberships.
3. Database policies (RLS recommended) enforce `tenant_id = current_setting('app.tenant_id')` (or equivalent).
4. Cross-tenant data access is forbidden except:
   - Platform operators via dedicated audited admin tools.
   - Explicit future features (e.g., federation) that are not in MVP.
5. File/object keys always include `tenant_id` prefix.
6. Background jobs and report generators run under a specific tenant context.
7. Logs and metrics are tagged with `tenant_id` where applicable.

Violation of isolation is a P0 security incident.

---

## 2. Role Definitions (Tenant-Scoped)

| Role                | Code          | Description |
|---------------------|---------------|-------------|
| Mosque Admin        | `admin`       | Full control within the tenant. User management, settings, all modules. |
| Treasurer           | `treasurer`   | Full accounting: post journals, manage funds, cash/bank, receipts, reports. Cannot change core settings or users. |
| Approver            | `approver`    | View pending items and approve/reject according to policy. Read access to relevant reports. |
| Committee Member    | `committee`   | Oversight: view reports, balances, audit summaries, announcements. Limited write (meetings later). |
| Staff               | `staff`       | Personal profile, internal announcements, basic attendance/leave. No financial write. |
| Viewer / Public Reporter | `viewer` | Read-only access to non-sensitive reports and public-facing data. |
| Platform Operator   | `platform_ops`| Cross-tenant. Separate elevation path. |

A user may hold multiple roles within one tenant (e.g., Treasurer + Approver is possible but not recommended for segregation of duties).

**Segregation of Duties Recommendation (not enforced by system in MVP):**
- The person who posts large expenses should not be the sole approver.
- System can warn but not block dual roles initially.

---

## 3. Permission Matrix (MVP)

Legend:  
✅ Full access 🔍 Read-only ⚠️ Limited / conditional ❌ No access

| Capability                              | Admin | Treasurer | Approver | Committee | Staff | Viewer |
|-----------------------------------------|-------|-----------|----------|-----------|-------|--------|
| **Tenant Settings & Branding**          | ✅    | ❌        | ❌       | ❌        | ❌    | ❌     |
| **User Invite / Role Assignment**       | ✅    | ❌        | ❌       | ❌        | ❌    | ❌     |
| **Chart of Accounts / Fund Setup**      | ✅    | ⚠️ view  | ❌       | ❌        | ❌    | ❌     |
| **Approval Policy Config**              | ✅    | ❌        | ❌       | ❌        | ❌    | ❌     |
| **Post Journal Entries (income/exp)**   | ✅    | ✅        | ❌       | ❌        | ❌    | ❌     |
| **Create Fund Transfers**               | ✅    | ✅        | ❌       | ❌        | ❌    | ❌     |
| **Approve / Reject Requests**           | ✅    | ❌*       | ✅       | ❌        | ❌    | ❌     |
| **View Fund Balances & Reports**        | ✅    | ✅        | ✅       | ✅        | ❌    | 🔍**   |
| **View Full Audit Log**                 | ✅    | 🔍***    | 🔍***   | 🔍***    | ❌    | ❌     |
| **Issue Receipts / Vouchers**           | ✅    | ✅        | ❌       | ❌        | ❌    | ❌     |
| **Manage Assets**                       | ✅    | ⚠️        | ❌       | 🔍        | ❌    | ❌     |
| **Manage Staff Records**                | ✅    | ❌        | ❌       | 🔍        | ⚠️ own| ❌     |
| **Create / Publish Announcements**      | ✅    | ⚠️ internal| ❌      | ✅        | ❌    | ❌     |
| **View Public Pages Config**            | ✅    | ❌        | ❌       | ❌        | ❌    | ❌     |
| **Export Data**                         | ✅    | ✅        | 🔍       | 🔍        | ❌    | ❌     |

\* Treasurer may approve only if also given Approver role or if policy allows self-approval for small amounts (configurable).  
\*\* Viewer may see only reports explicitly marked public or committee-shared.  
\*\*\* Filtered to financial actions relevant to their scope; full raw log for Admin only.

---

## 4. Platform Operator Permissions

Platform operators can:
- Create / suspend / reactivate tenants.
- View tenant metadata and usage statistics.
- Impersonate a tenant admin (must be explicitly audited, time-limited, reason required).
- Access system health, global audit of platform actions.
- Manage billing plans (later).

They **cannot**:
- Silently read or modify tenant financial data without impersonation + audit trail.
- Bypass normal approval workflows inside a tenant while impersonating (impersonation itself is the elevation).

---

## 5. Data Privacy Requirements

1. **Least privilege** — roles grant only what is needed.
2. **Sensitive fields** — donor personal notes, staff salaries, private contact numbers are visible only to roles that require them (Admin, Treasurer for finance; Admin/Committee for staff details).
3. **Public surface** — only data explicitly marked public is exposed on unauthenticated routes.
4. **Export & deletion** — tenant admin can request full data export. Account/tenant deletion follows a defined retention then purge process (legal review required — see SECURITY.md).
5. **Personal data of jamaah / donors** — treat as sensitive; minimize collection; purpose limitation.

No claim is made that the system currently satisfies any specific privacy law. Compliance analysis is an open work item.

---

## 6. Implementation Notes

- Prefer a central permission check function / policy class rather than scattered `if role == ...`.
- Cache membership + roles per session (invalidate on role change).
- All permission-denied events should be logged at appropriate level (not necessarily full audit).
- Frontend hides UI elements the user cannot use, but backend always re-validates.

---

## 7. Open Decisions

| ID | Topic | Notes |
|----|-------|-------|
| OD-PERM-01 | Hard enforcement of segregation of duties | Warn only vs block dual Treasurer+Approver |
| OD-PERM-02 | Self-approval thresholds | Configurable small amount that Treasurer can post without Approver |
| OD-PERM-03 | Viewer role scope | Exactly which reports are available |
| OD-PERM-04 | Committee write permissions in MVP | Read-only vs limited announcement / meeting notes |
| OD-PERM-05 | Platform impersonation UX & audit depth | Required fields, notification to tenant admin? |

---

*Permission model will be refined after role workshops with pilot mosques.*
