# Masjid Amanah — Product Requirements Document (PRD)

**Version:** 0.1 (Draft for Review)  
**Date:** 2026-10-23  
**Status:** Pre-implementation — awaiting stakeholder review  
**Product:** Masjid Amanah — Bangla-first, multi-tenant mosque management SaaS for Bangladesh  

---

## 1. Vision & Goals

### 1.1 Vision
Masjid Amanah provides transparent, trustworthy (amanah), and easy-to-use digital tools so every mosque in Bangladesh can manage its finances, people, assets, and communication with full accountability to the community and donors.

### 1.2 Primary Goals
- Enable accurate double-entry accounting with fund restrictions (Zakat, Sadaqah, General, Waqf, etc.).
- Deliver a Bangla-first experience (UI, notifications, reports, receipts) with English as secondary.
- Support multi-tenancy with strong data isolation between mosques.
- Make public transparency optional but easy (public financial summaries, announcements, prayer times).
- Reduce manual paper/spreadsheet work for treasurers and committees.
- Provide clear approval workflows and full audit trails.

### 1.3 Non-Goals (Out of Scope for MVP)
- Full Islamic banking / investment modules.
- Mobile native apps (responsive web first).
- Advanced AI features (OCR receipts, chatbot).
- Integration with national Zakat boards or BAZNAS-style systems (future consideration).
- Online payment collection (record donations only; gateway integration later).

### 1.4 Success Metrics (Initial)
- Time to first useful financial report < 1 hour after setup.
- Treasurer can post a day’s collections and expenses in < 10 minutes.
- 100% of material transactions have an immutable audit trail.
- Public pages load in Bangla by default on Bangladesh networks.

---

## 2. Personas & Roles

| Persona              | Description                                      | Primary Needs |
|----------------------|--------------------------------------------------|---------------|
| Public Visitor      | Any internet user / local jamaah                 | Mosque info, prayer times, announcements, public reports, contact |
| Mosque Administrator| Overall mosque operations lead                   | Setup, users, settings, overview dashboard |
| Treasurer           | Responsible for cash, bank, books                | Ledger, funds, receipts, daily close, reports |
| Approver            | Committee member authorized to approve expenses/transfers | Review & approve pending items |
| Staff               | Imam, muezzin, cleaner, teacher, etc.            | Attendance, leave, basic profile, announcements |
| Committee Member    | Elected / appointed governing body               | Oversight reports, meetings, approvals, assets |
| Platform Operator   | Masjid Amanah team                               | Tenant provisioning, billing, support, system health |

Roles are assigned per tenant (mosque). A user may have different roles in different mosques (rare but supported).

---

## 3. Functional Requirements by Area

### 3.1 Public Pages (Unauthenticated / Limited Auth)
- Mosque public profile (name, address, contact, imam, committee contacts — configurable visibility).
- Prayer times (manual entry or calculation-based; Hijri date support).
- Announcements & events (list + detail).
- Public financial transparency (optional monthly/annual summary by fund — configurable by admin).
- Asset / facility overview (optional).
- Contact / location map.
- Bangla primary; language toggle.

### 3.2 Authentication & Tenant Context
- Phone/email + OTP or password login.
- Multi-tenant: user selects or is routed to their mosque(s).
- Session carries tenant_id; all queries scoped.

### 3.3 Mosque Administration
- Tenant profile & branding (logo, colors, custom domain optional later).
- User invitation & role assignment.
- Chart of Accounts (pre-seeded + custom).
- Fund definitions with restriction rules.
- Approval workflow configuration (thresholds, required roles).
- Fiscal year / period settings.
- Audit log viewer (filtered).

### 3.4 Accounting & Treasury (Core)
- Double-entry journal entries.
- Fund-restricted accounts (Zakat, Sadaqah, General, Construction, Waqf, etc.).
- Cash & bank account tracking (multiple).
- Income categories (collections, donations, rental, etc.).
- Expense categories with approval rules.
- Transfers between funds (with rules & approval).
- Corrections / reversing entries (never delete posted entries).
- Daily/period close.
- Receipts & vouchers (printable / PDF, Bangla).
- Bank reconciliation (manual for MVP).

### 3.5 Approvals
- Pending queue for expenses above threshold, fund transfers, large corrections.
- Multi-level optional (simple single approver first).
- Comments + decision history.

### 3.6 Staff Management
- Staff profiles (basic HR: role, contact, join date).
- Simple attendance (manual or QR later).
- Leave requests (basic).
- Salary / stipend recording linked to ledger (payment runs).

### 3.7 Committee
- Committee membership & terms.
- Meeting notes / decisions (simple).
- Oversight dashboards (fund balances, pending approvals, recent large transactions).

### 3.8 Assets
- Asset register (category, location, value, condition, photos).
- Assignment / custody tracking.
- Maintenance logs (basic).
- Depreciation (simple straight-line optional later).

### 3.9 Announcements & Communication
- Create / schedule announcements (public or internal).
- Target audiences (all, staff, committee).
- SMS/Email optional (credit-based, later).

### 3.10 Reports
- Trial balance, income statement by fund, balance sheet by fund.
- Cash flow.
- Donor / collection summaries.
- Staff payment reports.
- Export CSV / PDF (Bangla + English labels).
- Public summary reports (configurable).

### 3.11 Platform Administration
- Tenant CRUD (create, suspend, delete with retention policy).
- Global user search / support impersonation (audited).
- System health, usage metrics.
- Billing (plan, invoices) — later.
- Feature flags / plan limits.

---

## 4. MVP vs Later Releases

### MVP (Release 1.0) — Must Have
- Multi-tenant isolation (shared DB with tenant_id + RLS or equivalent).
- Bangla-first UI (core screens).
- Public mosque page + prayer times + announcements.
- User management + roles (Admin, Treasurer, Approver, Committee, Staff, Viewer).
- Chart of Accounts + Funds with restriction flags.
- Double-entry journal + fund tagging.
- Income / Expense entry with optional approval workflow.
- Fund transfers with approval.
- Basic reports (fund balances, income/expense by period, trial balance).
- Audit log for financial actions.
- Asset register (basic CRUD).
- Staff list + simple profiles.
- Receipt / voucher PDF generation.
- Manual bank accounts & cash.

### Later (Post-MVP)
- Online donation collection (bKash/Nagad/SSLCommerz etc.).
- Advanced approval chains & thresholds.
- Full HR (payroll calculation, attendance devices).
- Meeting management & voting.
- SMS/WhatsApp notifications.
- Custom domains & white-label.
- Mobile apps / PWA enhancements.
- Advanced analytics & AI receipt OCR.
- Multi-branch within a tenant (complex).
- Integration with external Zakat / government systems.
- Offline-first progressive web app features.
- Depreciation & fixed-asset accounting sophistication.
- Donor CRM & recurring pledges.

---

## 5. User Stories & Acceptance Criteria (Selected Core)

### Public Visitor
**US-PUB-01**  
As a public visitor, I want to see the mosque’s prayer times and announcements in Bangla so that I can plan my visit.  
**Acceptance:**
- Given a published mosque, when I open its public URL, I see today’s prayer times and the latest 5 announcements in Bangla by default.
- Language toggle switches to English without page reload (or minimal).
- Prayer times can be manually set or auto-calculated; both work.

### Mosque Administrator
**US-ADM-01**  
As an administrator, I want to invite users and assign roles so that the right people have the right access.  
**Acceptance:**
- I can invite by phone or email.
- Roles are selectable from the defined set.
- Invited user receives a link/OTP and lands in the correct tenant context.
- Role changes take effect on next request and are audited.

### Treasurer
**US-TRE-01**  
As a treasurer, I want to record a cash collection against a specific fund so that balances stay accurate.  
**Acceptance:**
- I select date, fund, amount, payment method (cash/bank), optional donor note.
- System creates balanced double-entry (Debit Cash/Bank, Credit Income – Fund X).
- Receipt number is generated and printable in Bangla.
- Entry appears in fund balance and audit log immediately.

**US-TRE-02**  
As a treasurer, I want to transfer money between funds with proper approval when required.  
**Acceptance:**
- Transfer creates two balanced entries (or a transfer journal).
- If amount > configured threshold, status = Pending Approval.
- Approver can approve/reject with comment.
- Only approved transfers update available balances for spending.

**US-TRE-03**  
As a treasurer, I want to correct a posted error without deleting history.  
**Acceptance:**
- I create a reversing entry linked to the original.
- Original remains visible and immutable.
- Net effect is zero; audit shows both.

### Approver
**US-APP-01**  
As an approver, I want a clear queue of items needing my decision.  
**Acceptance:**
- Dashboard shows pending count and list (expense, transfer, correction).
- I can view full details + supporting notes/attachments.
- Approve / Reject with mandatory comment for reject.
- Decision is recorded with timestamp and user.

### Committee Member
**US-COM-01**  
As a committee member, I want to see fund balances and recent large transactions so I can exercise oversight.  
**Acceptance:**
- Dashboard shows current balance per fund and last 10 material movements.
- I can drill into any report available to my role.
- I cannot post journal entries unless also given Treasurer role.

### Staff
**US-STF-01**  
As staff, I want to see announcements relevant to me and update my profile.  
**Acceptance:**
- Internal announcements appear on my home screen.
- I can edit contact details and emergency contact.
- I cannot access financial ledgers.

### Platform Operator
**US-OPS-01**  
As a platform operator, I want to create a new mosque tenant and assign the first admin.  
**Acceptance:**
- Tenant is created with unique slug/subdomain.
- First admin is invited and can complete setup (funds, CoA, fiscal year).
- Tenant is isolated; no data leakage possible via normal queries.

---

## 6. Route Map (High-Level)

### Public (no auth or light auth)
```
/                                 → Platform landing / mosque finder
/m/{mosque-slug}                  → Mosque public home
/m/{mosque-slug}/prayer-times
/m/{mosque-slug}/announcements
/m/{mosque-slug}/announcements/{id}
/m/{mosque-slug}/reports/public   → Optional public financial summary
/m/{mosque-slug}/contact
/m/{mosque-slug}/assets           → Optional public asset view
```

### Authenticated App (tenant-scoped)
```
/app                              → Tenant selector / home
/app/dashboard                    → Role-based dashboard

# Accounting
/app/accounting                   → Overview
/app/accounting/journal
/app/accounting/journal/new
/app/accounting/journal/{id}
/app/accounting/funds
/app/accounting/funds/{id}
/app/accounting/transfers
/app/accounting/approvals
/app/accounting/cash-bank
/app/accounting/reconciliation
/app/accounting/receipts

# Reports
/app/reports
/app/reports/trial-balance
/app/reports/income-expense
/app/reports/fund-balances
/app/reports/cash-flow
/app/reports/export

# People
/app/staff
/app/staff/{id}
/app/committee
/app/users                        → Admin only
/app/users/invite

# Assets
/app/assets
/app/assets/{id}
/app/assets/categories

# Communication
/app/announcements
/app/announcements/new

# Settings (Admin)
/app/settings
/app/settings/mosque
/app/settings/funds
/app/settings/chart-of-accounts
/app/settings/approvals
/app/settings/fiscal
/app/settings/audit-log
```

### Platform Admin
```
/platform
/platform/tenants
/platform/tenants/new
/platform/tenants/{id}
/platform/users
/platform/health
/platform/billing                 → Later
```

All `/app/*` routes enforce tenant context and role permissions.

---

## 7. Open Decisions (Must Resolve Before Implementation)

| ID | Decision | Options / Notes | Owner |
|----|----------|-----------------|-------|
| OD-01 | Primary auth method | Phone OTP (bKash-style) vs Email+Password vs both | Product |
| OD-02 | Prayer time source | Manual only vs Aladhan/IslamicFinder API + override | Product |
| OD-03 | Default funds & restriction rules | Standard set for BD mosques; confirm Zakat vs Sadaqah vs General | Domain expert |
| OD-04 | Approval thresholds | Configurable per fund / global? Default values? | Product |
| OD-05 | Receipt numbering | Per fund / global sequential / yearly reset | Product |
| OD-06 | Multi-mosque users | Supported? How is context switched? | Architecture |
| OD-07 | Soft-delete vs hard retention for financial data | Legal / amanah requirements | Legal + Product |
| OD-08 | Bangla typography & number formatting | bn-BD locale, Taka symbol, Hijri calendar library | Engineering |
| OD-09 | Offline capability priority | None for MVP vs limited PWA | Product |
| OD-10 | Payment gateway for future donations | bKash, Nagad, SSLCommerz priority order | Product |

---

## 8. Assumptions
- Each mosque is an independent legal/operational entity (tenant).
- Users trust the platform with sensitive financial data; therefore isolation and audit are non-negotiable.
- Internet connectivity is generally available but not perfect; design for eventual consistency where possible later.
- Primary currency is BDT (Bangladeshi Taka). Multi-currency not required for MVP.
- No formal guarantee of compliance with any specific regulation is claimed in this document.

---

*End of PRD v0.1 — Ready for review.*
