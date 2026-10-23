# Digital donations — design & demo phase

## Demo vs production

| Capability | Demo (current) | Production (future) |
|------------|----------------|---------------------|
| Amount / fund / anonymity UI | Yes | Yes |
| Collect PIN / OTP / card / wallet password | **Never** | Gateway-hosted only |
| Status `paid_verified` from frontend | **Never** | Only after server verifies gateway |
| SSLCommerz / bKash / Nagad | Abstracted, not connected | Server-side env credentials |
| Ledger post on payment | **Not done** | After verified payment + idempotent post |
| Public list of donors | Privacy rules defined | Filter: no name/phone/email/payment ref if anonymous |

## Provider abstraction

`src/lib/donations/provider.ts`

- `DemoPaymentProvider` → always `demo_not_processed`
- Future: `sslcommerz` / `bkash` / `nagad` adapters using server env vars only
- Callback verification + status query required before `paid_verified`
- Duplicate posting prevented via idempotency keys (accounting engine)

## Privacy

- `visibility = anonymous_public` → `publicDisplayName = null` in public APIs
- Contact fields may be stored for authorized finance staff (future DB) but **not** returned on public endpoints
- Public reports must not show payment gateway references for anonymous gifts

## Accounting (later)

Verified donation → donation/payment record + balanced journal (cash debit, income credit, fund-tagged) via existing `post_journal` path — not implemented in this UI phase.

## Routes

- Public: `/m/[slug]/donate`
- Admin: `/app/donations`
- API: `POST /api/donations/initiate` (demo only)
