# Masjid Amanah — Security, Privacy, Deployment, Backup & Recovery

**Version:** 0.1 (Draft for Review)  
**Status:** Pre-implementation  

**Important:** This document describes intended security and operational controls. It does **not** constitute a legal compliance guarantee, certification, or formal risk assessment. All regulatory and legal requirements for Bangladesh (or any other jurisdiction) must be validated by qualified legal counsel. Unresolved items are marked clearly.

---

## 1. Security Objectives

1. Protect the confidentiality and integrity of mosque financial records and personal data.
2. Enforce strict tenant isolation.
3. Maintain a complete, tamper-evident audit trail of material actions (especially money movement and permission changes).
4. Enable recovery from hardware failure, human error, and (within defined limits) ransomware or other incidents.
5. Minimize the blast radius of any single compromise.

---

## 2. Tenant Isolation (Recap)

See `PERMISSIONS.md` and `ARCHITECTURE.md`.  

Defense in depth:
- Application-layer scoping.
- Database Row-Level Security (or equivalent) as a hard boundary.
- Separate object-storage prefixes.
- No shared caches that mix tenant data without keys containing tenant_id.

---

## 3. Authentication & Session Security

- Prefer strong authentication: OTP to verified mobile number and/or email + password.
- Passwords (if used): modern hashing (Argon2id or bcrypt with appropriate cost), never stored in reversible form.
- Session tokens: short-lived, rotated, bound to tenant context where possible.
- Protection against common attacks: rate limiting on login/OTP, CSRF protection on state-changing forms, secure cookie flags.
- Optional future: TOTP / WebAuthn for elevated roles.

**Open Decision (OD-SEC-01):** Exact auth methods and whether OTP is mandatory for financial roles.

---

## 4. Authorization & Audit

- All authorization decisions for financial actions are logged.
- Audit log entries for journal posting, approval decisions, role changes, and tenant configuration changes are append-only and retained for a defined period (target ≥ 7 years for financial records — **legal confirmation required**).
- Platform operator actions (especially impersonation) require reason and are highly visible in logs.

---

## 5. Data Protection

### 5.1 In Transit
- TLS 1.2+ for all external connections.
- Internal service communication preferably over mTLS or private network.

### 5.2 At Rest
- Database encryption at rest (managed service or volume encryption).
- Object storage encryption at rest.
- Secrets (API keys, DB credentials) in a secrets manager, never in source control or plain environment variables in production.

### 5.3 Personal & Sensitive Data
- Collect only what is necessary for the stated purpose.
- Donor and staff personal data treated as sensitive.
- Public pages expose only data explicitly approved by the mosque admin.

### 5.4 Privacy Rights (Placeholder)
- Tenant admins can export their data.
- Process for account/tenant deletion and data purge will be defined.
- **Unresolved:** Mapping to any applicable Bangladesh data protection rules or sector guidance. Legal review required. No compliance claim is made here.

---

## 6. Application Security Practices (Expected)

- Input validation and parameterized queries (no string-concatenated SQL).
- Output encoding appropriate to context.
- Dependency scanning and timely patching.
- Least-privilege service accounts.
- Secure development checklist before production releases.
- Regular review of RLS policies and permission matrix.

---

## 7. Deployment Requirements

- Separate environments: development, staging, production.
- Infrastructure-as-code preferred for reproducibility.
- Automated CI pipeline with tests; production deploys require approval for major changes.
- Blue/green or rolling deployments to minimize downtime.
- Feature flags for gradual rollout of sensitive features.
- No production data in non-production environments unless anonymized and approved.

---

## 8. Backup, Monitoring & Recovery

### 8.1 Backup
- Continuous or near-continuous WAL archiving for the primary database (or equivalent PITR capability).
- Daily full logical or physical backups retained according to policy.
- Object storage versioning or separate backup copies for critical generated files (receipts).
- Backups encrypted and stored in a separate failure domain from production.
- Periodic restore tests (at least quarterly) with documented results.

### 8.2 Recovery Targets (Initial Proposals)
| Metric | Target (MVP) | Notes |
|--------|--------------|-------|
| RPO (Recovery Point Objective) | ≤ 15 minutes | For database |
| RTO (Recovery Time Objective) | ≤ 4 hours | For full service restoration |
| Backup retention | 30 days daily + longer monthly/yearly as needed | Legal retention for financial data may be longer |

These targets are engineering goals, not contractual SLAs until defined.

### 8.3 Monitoring & Alerting
- Uptime / synthetic monitoring of public pages and critical API paths.
- Error rate, latency, and saturation metrics.
- Database connection and replication lag.
- Unusual spikes in failed logins or permission denials.
- Disk / storage capacity.
- Alerting to on-call with clear runbooks for common incidents.

### 8.4 Incident Response (High-Level)
- Defined severity levels.
- Communication plan for affected tenants in case of data-impacting incidents.
- Post-incident review process.
- **Unresolved:** Formal incident response plan and external notification obligations — legal/operational input required.

---

## 9. Major Technical & Operational Risks

| Risk | Likelihood | Impact | Mitigation Approach |
|------|------------|--------|---------------------|
| Cross-tenant data leakage | Low (if controls followed) | Critical | RLS + code review + isolation tests |
| Unauthorized financial posting | Medium | High | Approval workflows, audit, role separation |
| Loss of financial history | Low | Critical | Immutable journals, strong backups, restore tests |
| Account takeover of treasurer/admin | Medium | High | Strong auth, rate limits, optional 2FA later |
| Ransomware / wholesale encryption | Low–Medium | Critical | Offline / immutable backups, least privilege, monitoring |
| Operational error during migration or restore | Medium | High | Runbooks, staging practice, dual control for destructive ops |
| Dependency / supply-chain vulnerability | Medium | High | Scanning, minimal dependencies, timely updates |
| Key person / single point of failure in ops | Medium | Medium | Documentation, multiple trained operators |
| Misconfiguration of public reports exposing private data | Medium | High | Explicit opt-in for public financial data, review UI |
| Regulatory or donor trust failure due to perceived opacity | Medium | High | Transparent design, clear audit, optional public reports |

---

## 10. Open Security & Compliance Items

| ID | Item | Status |
|----|------|--------|
| OD-SEC-01 | Final authentication methods & MFA policy | Open |
| OD-SEC-02 | Exact retention periods for audit logs and financial data under applicable rules | Needs legal input |
| OD-SEC-03 | Formal data processing / privacy notice content | Needs legal + product |
| OD-SEC-04 | Incident notification obligations and timelines | Needs legal |
| OD-SEC-05 | Penetration testing schedule and scope before launch | To be planned |
| OD-SEC-06 | Encryption key management details (who holds keys, rotation) | Open |
| OD-SEC-07 | Whether any specific Bangladesh ICT / financial / nonprofit rules apply to the platform operator | Needs legal |

---

*Security is a continuous process. This document will be updated as decisions are made and as the system is implemented and tested.*
