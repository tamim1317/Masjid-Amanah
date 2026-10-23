# Masjid Amanah — Logical Database Schema & ER Overview

**Version:** 0.1 (Draft for Review)  
**Status:** Pre-implementation  

---

## 1. Design Principles

1. Every tenant-owned table has a non-nullable `tenant_id`.
2. Financial records are append-only in spirit: posted journals are never hard-deleted.
3. Soft deletes (`deleted_at`) used for non-financial entities where recovery is useful.
4. All monetary amounts stored as integer minor units (poisha) or decimal(18,2) — decision needed; prefer minor units for exactness.
5. Timestamps in UTC; display in Asia/Dhaka.
6. Audit columns: `created_at`, `created_by`, `updated_at`, `updated_by` where meaningful; separate immutable audit log for financial actions.

**Open Decision (OD-DB-01):** Amount storage — `BIGINT` poisha vs `DECIMAL(18,2)`. Recommend BIGINT for money to avoid floating-point issues.

---

## 2. Core Entity Groups

### 2.1 Platform & Tenancy
- `tenants` — mosque organizations
- `users` — global identity
- `tenant_memberships` — user ↔ tenant + role(s)
- `roles` / `permissions` (or hardcoded enum for MVP)

### 2.2 Mosque Profile & Public
- `mosque_profiles` (or columns on tenants)
- `prayer_times` / `prayer_time_overrides`
- `announcements`
- `public_report_configs`

### 2.3 People
- `staff`
- `committee_members`
- `committee_terms` (optional)

### 2.4 Accounting Core
- `funds`
- `accounts` (Chart of Accounts)
- `journal_entries`
- `journal_lines`
- `fund_balances` (materialized or computed)
- `approval_requests`
- `bank_accounts` / `cash_registers`
- `receipts` / `vouchers`

### 2.5 Assets
- `asset_categories`
- `assets`
- `asset_movements` / `asset_assignments`

### 2.6 Audit & System
- `audit_logs`
- `attachments` (polymorphic or linked)

---

## 3. Logical Schema (Key Tables)

### tenants
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| slug                | string unique | public URL identifier |
| name                | string        | Bangla + English possible |
| status              | enum          | active, suspended, pending |
| timezone            | string        | Asia/Dhaka default |
| fiscal_year_start   | date or month | |
| settings            | jsonb         | branding, feature flags, approval thresholds |
| created_at          | timestamptz   | |

### users
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| phone               | string unique | nullable if email-only |
| email               | string unique | nullable |
| password_hash       | string        | nullable for OTP-only |
| name                | string        | |
| locale              | string        | bn / en |
| is_platform_admin   | boolean       | |
| created_at          | timestamptz   | |

### tenant_memberships
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| user_id             | FK            | |
| roles               | array/enum[]  | or join table |
| status              | enum          | active, invited, revoked |
| invited_at          | timestamptz   | |
| accepted_at         | timestamptz   | |

Unique (tenant_id, user_id).

### funds
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| code                | string        | e.g. ZAKAT, SADAQAH, GENERAL |
| name_bn             | string        | |
| name_en             | string        | |
| restriction_type    | enum          | unrestricted, restricted, temporarily_restricted |
| description         | text          | usage rules |
| is_active           | boolean       | |
| sort_order          | int           | |

### accounts (Chart of Accounts)
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| code                | string        | hierarchical possible |
| name_bn / name_en   | string        | |
| type                | enum          | asset, liability, equity, income, expense |
| subtype             | string        | cash, bank, receivable, etc. |
| fund_id             | FK nullable   | if account is fund-specific |
| parent_id           | FK nullable   | for hierarchy |
| is_system           | boolean       | cannot delete |
| is_active           | boolean       | |

### journal_entries
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| entry_number        | string        | sequential per tenant or per year |
| entry_date          | date          | |
| description         | text          | |
| status              | enum          | draft, pending_approval, posted, voided |
| source_type         | enum          | manual, receipt, transfer, correction, salary... |
| source_id           | UUID nullable | polymorphic link |
| posted_at           | timestamptz   | |
| posted_by           | FK users      | |
| reversed_by_id      | FK nullable   | points to reversing entry |
| reverses_id         | FK nullable   | points to original |
| created_by          | FK            | |

### journal_lines
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | denormalized for RLS |
| journal_entry_id    | FK            | |
| account_id          | FK            | |
| fund_id             | FK            | required for restricted accounting |
| debit               | bigint/decimal| |
| credit              | bigint/decimal| |
| memo                | text          | |
| line_order          | int           | |

Constraint: for each journal_entry, SUM(debit) = SUM(credit).

### approval_requests
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| request_type        | enum          | expense, transfer, correction, other |
| reference_id        | UUID          | journal or transfer id |
| amount              | money         | |
| requested_by        | FK            | |
| status              | enum          | pending, approved, rejected, cancelled |
| decided_by          | FK nullable   | |
| decided_at          | timestamptz   | |
| decision_comment    | text          | |
| created_at          | timestamptz   | |

### bank_accounts / cash_registers
Simple tables linking to asset-type accounts, with current balance cache optional.

### receipts
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| receipt_number      | string        | unique per tenant |
| journal_entry_id    | FK            | |
| payer_name          | string        | optional |
| amount              | money         | |
| fund_id             | FK            | |
| issued_at           | timestamptz   | |
| pdf_path            | string        | object storage |

### assets
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| category_id         | FK            | |
| name                | string        | |
| description         | text          | |
| acquisition_date    | date          | |
| acquisition_value   | money         | |
| current_value       | money nullable| |
| location            | string        | |
| condition           | enum          | |
| custodian_staff_id  | FK nullable   | |
| status              | enum          | active, disposed, lost |
| photos              | jsonb or attachments | |

### announcements
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK       | |
| tenant_id           | FK            | |
| title_bn / title_en | string        | |
| body_bn / body_en   | text          | |
| visibility          | enum          | public, internal, staff, committee |
| published_at        | timestamptz   | |
| expires_at          | timestamptz nullable | |
| created_by          | FK            | |

### audit_logs
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | UUID/PK or bigserial | |
| tenant_id           | FK nullable   | null for platform actions |
| actor_user_id       | FK            | |
| action              | string        | e.g. journal.posted, membership.role_changed |
| entity_type         | string        | |
| entity_id           | UUID          | |
| old_values          | jsonb         | |
| new_values          | jsonb         | |
| ip_address          | inet          | |
| user_agent          | string        | |
| created_at          | timestamptz   | |

High volume; consider partitioning by time or tenant later.

---

## 4. Entity-Relationship Summary (Textual ER)

```
tenants 1──* tenant_memberships *──1 users
tenants 1──* funds
tenants 1──* accounts
tenants 1──* journal_entries 1──* journal_lines
journal_lines *──1 accounts
journal_lines *──1 funds
journal_entries 1──0..1 approval_requests
journal_entries 1──0..1 receipts
tenants 1──* assets *──1 asset_categories
tenants 1──* announcements
tenants 1──* staff
tenants 1──* committee_members
tenants 1──* audit_logs
users 1──* audit_logs (as actor)
```

Fund balances are derived:
```
Available balance of Fund F =
  SUM(journal_lines.credit for income accounts of F)
  - SUM(journal_lines.debit for expense accounts of F)
  ± transfer effects
  (only considering posted entries)
```

Or maintained via triggers / materialized view for performance.

---

## 5. Indexes (Critical)

- All tables: `(tenant_id)` or leading composite.
- `journal_entries (tenant_id, entry_date)`, `(tenant_id, status)`.
- `journal_lines (tenant_id, fund_id)`, `(journal_entry_id)`.
- `audit_logs (tenant_id, created_at)`.
- Unique constraints: `(tenant_id, code)` on funds and accounts, `(tenant_id, receipt_number)`, etc.

---

## 6. Data Retention & Soft Delete

- Financial journals and lines: never hard-delete after posting. Void via reversing entry.
- Soft-delete for drafts, announcements, staff records (with care).
- Platform-level retention policy for deleted tenants: export + quarantine period then purge (legal review required).

---

## 7. Open Database Decisions

| ID | Topic | Recommendation / Notes |
|----|-------|------------------------|
| OD-DB-01 | Money type | BIGINT (poisha) preferred |
| OD-DB-02 | UUID vs serial PKs | UUID for distributed safety |
| OD-DB-03 | Fund balance storage | Computed + cache table or materialized view |
| OD-DB-04 | Attachment storage | Object store + metadata table |
| OD-DB-05 | Full-text search for announcements | Postgres FTS or external later |
| OD-DB-06 | Partitioning strategy for audit_logs & journals | Time-based when volume grows |

---

*Schema is logical. Physical implementation (Postgres types, exact constraints, RLS policies) will be defined in implementation phase after review.*
