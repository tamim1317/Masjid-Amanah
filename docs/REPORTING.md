# Public financial transparency & reporting

## Rules

1. **Source of truth** = posted ledger (`transactions.status = 'posted'`) with **`publish_status = 'published'`**.
2. Drafts, pending approval, rejected, and unpublished rows never appear on public pages.
3. Donor phone/email, internal memos, and private attachments are not exposed.
4. Fund reports include only funds with `publish_status = 'published'`.
5. Published report snapshots store checksums; `verify_report_reconciliation` compares live ledger.

## Schema

- `published_reports` — period, revision, status, snapshot, checksum, supersedes chain
- `attachments.is_public` — opt-in public files
- `receipts.public_payer_label` — display name only (no phone)
- RPCs: `public_period_totals`, `public_fund_totals`, `public_transaction_list`, `publish_financial_report`, `verify_report_reconciliation`, `public_attachments_for_entity`

## UI

- `/m/[slug]/reports/public` — live period summary, fund cards, searchable published txs, report history
- `/m/[slug]/reports/public/pdf` — Bangla-oriented PDF from the same ledger totals

Place `assets/fonts/NotoSansBengali-Regular.ttf` for fuller Bangla glyph embedding in PDF (optional).

## Tests

```bash
npm test
./scripts/test-rls.sh   # includes 04_public_reporting.sql
```
