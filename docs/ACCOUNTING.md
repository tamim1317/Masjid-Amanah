# Accounting engine

## Principles

1. **Money = BIGINT poisha** (1 BDT = 100). No floats anywhere in storage or posting math.
2. **Double-entry only** — every journal has ≥2 lines and `Σ debit = Σ credit`.
3. **Atomic posting** — `post_journal` locks the row, validates balance + period, then sets `posted` in one transaction.
4. **Posted is immutable** — triggers block edits; corrections use `reverse_journal`.
5. **Mosque + fund scope** — FKs and same-mosque triggers; balances are per fund from posted lines only.
6. **Idempotency** — unique `(mosque_id, idempotency_key)` on journals, bills, payments.
7. **Approvals** — thresholds in `approval_thresholds`; separation of duties when configured.
8. **Periods** — `fiscal_periods` open/closed; closed months reject new posts.

## State machine

```
draft → pending_approval → approved → posted → reversed
  ↓           ↓
rejected   (reject)
```

Below-threshold submits may go `draft → approved` then `posted`.

## Core RPCs

| Function | Purpose |
|----------|---------|
| `refresh_transaction_totals` | Denormalize debit/credit sums |
| `assert_journal_balanced` | Fail if unbalanced |
| `submit_journal` | Submit + create approval if needed |
| `approve_journal` / `reject_journal` | Workflow |
| `post_journal` | Atomic post (FOR UPDATE) |
| `reverse_journal` | Opposite entry + mark original reversed |
| `create_fund_transfer` | Inter-fund cash move |
| `close_fiscal_period` | Month close |
| `fund_cash_balance_poisha` | Authoritative cash-by-fund total |

## Application API

`src/lib/accounting/service.ts` — server-only; calls `requireAccountingAccess` then RPC.

## Tests

```bash
npm test                                    # pure balance helpers
./scripts/migrate.sh && ./scripts/test-rls.sh  # includes 03_accounting_engine.sql
```

Coverage in `03_accounting_engine.sql`: balanced post, unbalanced reject, idempotency, approval + SoD, immutability, reversal, transfer, period close, concurrent post, reconciliation.

**Do not claim production readiness until these tests pass.** Payments gateways are out of scope.
