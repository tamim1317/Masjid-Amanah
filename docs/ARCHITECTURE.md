# Masjid Amanah — Architecture Overview

**Version:** 0.1 (Draft for Review)  
**Status:** Pre-implementation  

---

## 1. High-Level System Architecture

Masjid Amanah is a multi-tenant SaaS application.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                   │
│  Browser (Bangla-first responsive web)  │  Future: PWA / Mobile │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                     Edge / CDN / WAF                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  Application Layer                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Public API  │  │ Auth Service │  │ Tenant-Aware App Logic  │ │
│  │ (read-mostly)│  │ (OTP/JWT)   │  │ (scoped by tenant_id)   │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Permission / Policy Engine                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Data Layer                                   │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │ Primary DB       │   │ Object Storage   │   │ Cache/Queue │  │
│  │ (Postgres)       │   │ (receipts, files)│   │ (Redis)     │  │
│  │ + Row-Level Sec. │   │                  │   │             │  │
│  └──────────────────┘   └──────────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Observability & Ops                                 │
│  Logs │ Metrics │ Traces │ Backups │ Alerting                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **Tenant isolation first** — every query, every file, every log line is scoped or tagged by tenant.
2. **Bangla-first** — locale, formatting, and content defaults to bn-BD.
3. **Immutable financial history** — posted journal entries are never deleted; corrections are new entries.
4. **Audit everything material** — especially money movement and permission changes.
5. **Simple over clever** for MVP — shared database with strong RLS preferred over separate DBs per tenant initially.

---

## 2. Multi-Tenancy Model

**Chosen approach for MVP:** Shared database, shared schema, `tenant_id` on every tenant-owned table + Row-Level Security (RLS) or equivalent application-level enforcement + defense-in-depth.

### Rationale
- Cost-effective for many small mosques.
- Easier operational management (one backup, one migration path).
- Strong isolation possible with Postgres RLS + careful application code.

### Isolation Guarantees
- No cross-tenant reads or writes via normal application paths.
- Platform operators have elevated access only through audited admin tools.
- File storage paths include tenant_id.
- Background jobs carry tenant context.

### Future Options (if scale or compliance demands)
- Schema-per-tenant.
- Database-per-tenant for large or regulated customers.
- Hybrid.

**Open Decision (OD-ARCH-01):** Confirm shared-DB + RLS is acceptable for initial launch, or whether some customers will require dedicated DB from day one.

---

## 3. Authentication & Session

- Primary identifiers: mobile number (preferred in BD) and/or email.
- MVP auth: Password + optional OTP, or pure OTP (decision OD-01 in PRD).
- Sessions: short-lived JWT or server-side session with tenant context claim.
- Multi-tenant users: after login, user selects active mosque (or last-used). Context is sticky for the session.
- Platform operators: separate elevated login path or role flag with strict audit.

---

## 4. Authorization Model

- Role-Based Access Control (RBAC) with optional fine-grained permissions later.
- Roles are tenant-scoped.
- Permission checks happen at:
  1. Route / API middleware (tenant + role).
  2. Service layer (business rules, e.g., “can approve this amount”).
  3. Database (RLS policies as last line of defense).

See `PERMISSIONS.md` for the full matrix.

---

## 5. Accounting Engine (Logical)

The accounting core is a classic double-entry system with fund dimensions.

- Every financial event produces one or more balanced journal entries.
- Each line is tagged with:
  - Account (from Chart of Accounts)
  - Fund (restricted or unrestricted)
  - Optional cost center / project (later)
- Posted entries are immutable.
- Corrections = reversing entry + new correct entry, both linked.
- Approvals gate certain entry types before they affect “available” balances.

Detailed model in `DATABASE.md` and accounting section of PRD.

---

## 6. Internationalization & Localization

- Default locale: `bn-BD`.
- Secondary: `en`.
- Number formatting, currency (৳ / BDT), date (Gregorian + Hijri where useful).
- All user-facing strings externalized.
- PDF receipts and reports generated with Bangla font support.
- Right-to-left is not required (Bengali is LTR).

---

## 7. Deployment Model (Requirements)

### Environments
- Development
- Staging (production-like data isolation)
- Production

### Infrastructure Expectations
- Containerized application (or equivalent modern PaaS).
- Managed Postgres with point-in-time recovery.
- Object storage for generated PDFs, uploaded images, attachments.
- CDN for static assets and public pages.
- Secrets management (no secrets in code or env files committed).
- Horizontal scaling of app tier; DB as primary bottleneck initially.

### Backup & Recovery (see also SECURITY.md)
- Automated daily full + continuous WAL archiving (or equivalent).
- Tested restore procedure with RTO/RPO targets defined.
- Tenant-level data export capability for off-boarding.

### Monitoring
- Application performance monitoring.
- Error tracking.
- Business metrics (active tenants, journal volume, approval lag).
- Uptime and synthetic checks on public mosque pages.

---

## 8. Integration Points (Future-Ready)

- Payment gateways (bKash, Nagad, SSLCommerz) — webhook + reconciliation design needed later.
- SMS gateways for OTP and notifications.
- Email (transactional).
- Map services for location.
- Prayer time calculation libraries or external APIs (with cache).

No external integrations required for MVP beyond email/SMS for auth if chosen.

---

## 9. Non-Functional Requirements (Selected)

| Category          | Target (MVP)                          | Notes |
|-------------------|---------------------------------------|-------|
| Availability      | 99.5% monthly                         | Exclude planned maintenance |
| Public page load  | < 2s on 3G-equivalent in BD           | Critical path |
| Journal post      | < 500ms p95                           | |
| Data durability   | Zero data loss for committed financial entries | |
| Scalability       | Support 500 active mosques initially  | Design for 5k+ |
| Audit retention   | Minimum 7 years for financial audit logs | Configurable; legal advice needed |

---

## 10. Open Architectural Decisions

| ID | Topic | Notes |
|----|-------|-------|
| OD-ARCH-01 | Shared DB + RLS vs dedicated | Cost vs isolation strength |
| OD-ARCH-02 | Monolith vs modular services | Prefer modular monolith for MVP |
| OD-ARCH-03 | Primary language of backend | Any; frontend must be Bangla-ready |
| OD-ARCH-04 | Hijri calendar library & authority | Need reliable source |
| OD-ARCH-05 | File storage encryption at rest | Required; key management approach |

---

*This architecture document is intentionally high-level. Detailed component designs will follow after PRD sign-off.*
