# Masjid Amanah — Product Roadmap

**Version:** 0.1 (Draft for Review)  
**Status:** Pre-implementation  

---

## 1. Guiding Principles for Prioritization

1. Trust & transparency first (accounting integrity, audit, isolation).
2. Bangla-first usability for the primary users (treasurers, admins, committee).
3. Deliver a usable end-to-end loop for one mosque as early as possible.
4. Defer complexity (payments, multi-branch, AI, mobile apps) until the core ledger is solid.
5. Every release must be deployable and operable with the backup/monitoring baseline.

---

## 2. Release Phases

### Phase 0 — Foundation (Pre-MVP)
**Goal:** Architecture, schema, auth, tenancy, and empty shells validated.

- Multi-tenant skeleton with RLS / isolation tests.
- Auth (chosen method) + membership + basic roles.
- Bangla locale pipeline and core UI shell.
- Audit log infrastructure.
- CI, staging environment, basic monitoring, backup smoke test.
- Decision resolution for all OD-* items marked “must resolve before implementation”.

**Exit criteria:** Can create a tenant, invite a user, switch context, and see an empty dashboard with correct permissions. Isolation test suite passes.

---

### Phase 1 — MVP (Release 1.0)
**Goal:** A mosque can run its daily financial life and basic public presence.

**Must include:**
- Public mosque page (profile, prayer times, announcements).
- Full user & role management within tenant.
- Chart of Accounts + Fund definitions with restrictions.
- Double-entry journal entry (manual) with fund tagging.
- Income recording + receipt generation (PDF, Bangla).
- Expense recording with optional approval workflow.
- Fund transfers with approval.
- Correction / reversing entries.
- Core reports: fund balances, income & expense by period, trial balance.
- Basic asset register.
- Staff list + simple profiles.
- Committee / Viewer read access to reports.
- Platform operator: tenant create / suspend + basic health view.
- Full audit trail for financial and permission actions.
- Backup + restore procedure documented and tested once.

**Explicitly out of MVP:** Online payments, SMS campaigns, advanced HR, multi-level approval chains, custom domains, mobile apps, AI features.

**Success metrics:**
- Pilot mosques can close a month’s books using only the system.
- No cross-tenant data visible in any test.
- Public pages usable on typical Bangladesh mobile networks.

---

### Phase 2 — Trust & Usability Expansion
**Goal:** Reduce friction and increase confidence for committees and donors.

- Configurable approval thresholds and simple multi-approver option.
- Bank reconciliation helper (manual matching).
- Richer reports + scheduled PDF email to committee.
- Improved public financial transparency controls (opt-in summaries).
- Announcement targeting and basic internal messaging.
- Asset assignment / custody tracking.
- Better receipt / voucher templates and numbering rules.
- Export packages for external auditors.
- Performance and UX polish based on pilot feedback.
- Optional TOTP for elevated roles.

---

### Phase 3 — Growth Features
**Goal:** Support more complex operations and revenue collection.

- Online donation collection (bKash / Nagad / card gateway) with automatic ledger posting and reconciliation.
- Donor / contribution history (light CRM).
- Recurring pledges / reminders (optional).
- Staff attendance (manual or QR) and simple stipend/salary payment runs linked to ledger.
- Meeting notes / decision log for committee.
- Custom domain / white-label options for larger mosques.
- SMS / WhatsApp notification hooks (credit-based).
- Multi-branch light support (if strongly requested).

---

### Phase 4 — Scale & Intelligence
**Goal:** Operational excellence and advanced capabilities.

- Advanced analytics dashboards.
- AI-assisted receipt / invoice capture (OCR) with human confirmation.
- Deeper fixed-asset accounting (depreciation).
- Mobile apps or high-quality PWA offline capabilities.
- Platform billing & self-service plan management.
- Possible integrations with external Zakat or nonprofit systems (if demand and legal clarity exist).
- Multi-region or higher isolation options for large customers.

---

## 3. Cross-Cutting Workstreams (All Phases)

| Workstream              | Owner Focus          | Notes |
|-------------------------|----------------------|-------|
| Security & Isolation    | Ongoing              | RLS tests, pen-test before major launches |
| Bangla UX & Accessibility | Continuous         | Typography, number/date formatting, low-bandwidth |
| Observability & Ops     | Continuous           | Metrics, alerts, runbooks, restore drills |
| Documentation & Support | Continuous           | In-app help, Bangla guides for treasurers |
| Legal / Privacy Review  | Before public launch | Retention, notices, any sector rules |
| Pilot Feedback Loop     | Phase 1 → 2          | Real mosques, real books |

---

## 4. Major Risks Mapped to Roadmap

| Risk                              | Primary Mitigation Phase | Contingency |
|-----------------------------------|--------------------------|-------------|
| Accounting model too complex for users | Phase 1 design + pilot | Simplify UI; guided wizards |
| Isolation bug escapes testing     | Phase 0 + continuous   | Immediate incident process; RLS as backstop |
| Low adoption due to change resistance | Phase 1–2 UX + training | Parallel paper period; on-site support for pilots |
| Payment integration delays / compliance | Phase 3                | Keep manual recording excellent |
| Key person dependency in early ops | All phases             | Document everything; cross-train |
| Regulatory surprise               | Before Phase 1 launch  | Legal review; flexible data model |

---

## 5. Decision Gates

Before starting implementation of each phase:
1. All critical Open Decisions (OD-*) for that phase are resolved or explicitly deferred with risk acceptance.
2. PRD / Architecture / Schema sections for the phase are reviewed and signed off by product owner.
3. Security checklist for the phase is acknowledged.
4. Success metrics and exit criteria are agreed.

---

## 6. Immediate Next Steps (After This Document Review)

1. Stakeholder review of all six documents (`PRD`, `ARCHITECTURE`, `DATABASE`, `PERMISSIONS`, `SECURITY`, `ROADMAP`).
2. Resolve or explicitly defer the Open Decisions listed in each document.
3. Confirm pilot mosque candidates and their current paper/spreadsheet processes.
4. Finalize tech stack choices that affect schema and isolation (still no application code until review is complete).
5. Produce detailed implementation tickets only after Phase 0 / MVP scope is locked.

---

*This roadmap is a living plan. Dates and exact feature boundaries will be refined once resource capacity and pilot feedback are known.*
