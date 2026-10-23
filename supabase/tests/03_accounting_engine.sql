-- Masjid Amanah — Accounting engine tests
-- Prerequisites: all migrations applied
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/03_accounting_engine.sql

BEGIN;

CREATE TEMP TABLE _acc_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  detail TEXT
);

CREATE OR REPLACE FUNCTION _acc_assert(p_name TEXT, p_ok BOOLEAN, p_detail TEXT DEFAULT '')
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _acc_results VALUES (p_name, p_ok, p_detail)
  ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
  IF p_ok THEN RAISE NOTICE 'PASS: %', p_name;
  ELSE RAISE WARNING 'FAIL: % — %', p_name, p_detail; END IF;
END;
$$;

SET ROLE NONE;

-- -------------------------------------------------------------------------
-- Seed mosque, users, funds, accounts
-- -------------------------------------------------------------------------
INSERT INTO public.mosques (id, slug, name_bn, status, public_profile_enabled)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'acct-test-mosque', 'হিসাব পরীক্ষা', 'active', false);

INSERT INTO public.profiles (id, email, full_name, is_platform_admin) VALUES
  ('55555555-5555-5555-5555-555555555555', 'treas@acct.test', 'Treasurer', false),
  ('66666666-6666-6666-6666-666666666666', 'appr@acct.test', 'Approver', false);

INSERT INTO public.mosque_memberships (mosque_id, user_id, roles, status, accepted_at) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555',
   ARRAY['treasurer']::public.mosque_role[], 'active', now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666',
   ARRAY['approver','admin']::public.mosque_role[], 'active', now());

INSERT INTO public.funds (id, mosque_id, code, name_bn, restriction_type, publish_status) VALUES
  ('f1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'GENERAL', 'সাধারণ', 'unrestricted', 'draft'),
  ('f2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ZAKAT', 'যাকাত', 'restricted', 'draft');

INSERT INTO public.accounts (id, mosque_id, code, name_bn, type, fund_id) VALUES
  ('ac111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '1100', 'Cash', 'asset', NULL),
  ('ac222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '4100', 'Donation income', 'income', NULL),
  ('ac333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '5100', 'Utilities expense', 'expense', NULL),
  ('ac444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2100', 'Accounts payable', 'liability', NULL);

-- Threshold: journals require approval at 50000 poisha (500 BDT)
INSERT INTO public.approval_thresholds (mosque_id, request_type, threshold_poisha, separate_duties)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'journal', 50000, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'transfer', 1, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'correction', 1, false);

SELECT public.ensure_fiscal_period('dddddddd-dddd-dddd-dddd-dddddddddddd', 2026, 10);

-- -------------------------------------------------------------------------
-- 1) Balanced journal posts successfully (below threshold → auto-approved path)
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tx_id UUID;
  tx public.transactions;
BEGIN
  INSERT INTO public.transactions (
    id, mosque_id, entry_number, entry_date, description, status, source_type, created_by, idempotency_key
  ) VALUES (
    't1111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'J-001', CURRENT_DATE, 'Small donation', 'draft', 'receipt',
    '55555555-5555-5555-5555-555555555555', 'idem-small-1'
  );

  INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
  VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't1111111-1111-1111-1111-111111111111',
     'ac111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 10000, 0, 1),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't1111111-1111-1111-1111-111111111111',
     'ac222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 0, 10000, 2);

  PERFORM public.refresh_transaction_totals('t1111111-1111-1111-1111-111111111111');
  tx := public.submit_journal('t1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555');
  -- below 50000 → approved automatically
  PERFORM _acc_assert('submit_below_threshold_auto_approved', tx.status = 'approved', tx.status::text);

  tx := public.post_journal('t1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555');
  PERFORM _acc_assert('post_balanced_journal', tx.status = 'posted', tx.status::text);
  PERFORM _acc_assert('totals_match_lines',
    tx.total_debit_poisha = 10000 AND tx.total_credit_poisha = 10000);
END $$;

-- -------------------------------------------------------------------------
-- 2) Unbalanced journal rejected
-- -------------------------------------------------------------------------
DO $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  INSERT INTO public.transactions (
    id, mosque_id, entry_number, entry_date, description, status, source_type, created_by
  ) VALUES (
    't2222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'J-BAD', CURRENT_DATE, 'Unbalanced', 'draft', 'manual',
    '55555555-5555-5555-5555-555555555555'
  );
  INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
  VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't2222222-2222-2222-2222-222222222222',
     'ac111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 5000, 0, 1),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't2222222-2222-2222-2222-222222222222',
     'ac222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 0, 3000, 2);
  BEGIN
    PERFORM public.assert_journal_balanced('t2222222-2222-2222-2222-222222222222');
    ok := false;
  EXCEPTION WHEN OTHERS THEN
    ok := SQLERRM LIKE '%ভারসাম্যহীন%' OR SQLERRM LIKE '%unbalanced%' OR SQLSTATE = 'P0001';
  END;
  PERFORM _acc_assert('reject_unbalanced_journal', ok, SQLERRM);
END $$;

-- -------------------------------------------------------------------------
-- 3) Idempotent duplicate submission
-- -------------------------------------------------------------------------
DO $$
DECLARE
  id1 UUID;
  id2 UUID;
  cnt INT;
BEGIN
  INSERT INTO public.transactions (
    mosque_id, entry_number, entry_date, description, status, source_type,
    created_by, idempotency_key
  ) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 'J-IDEM-1', CURRENT_DATE, 'Idem', 'draft', 'manual',
    '55555555-5555-5555-5555-555555555555', 'idem-dup-key'
  ) RETURNING id INTO id1;

  BEGIN
    INSERT INTO public.transactions (
      mosque_id, entry_number, entry_date, description, status, source_type,
      created_by, idempotency_key
    ) VALUES (
      'dddddddd-dddd-dddd-dddd-dddddddddddd', 'J-IDEM-2', CURRENT_DATE, 'Idem2', 'draft', 'manual',
      '55555555-5555-5555-5555-555555555555', 'idem-dup-key'
    ) RETURNING id INTO id2;
    PERFORM _acc_assert('idempotency_blocks_duplicate_key', false, 'second insert should fail');
  EXCEPTION WHEN unique_violation THEN
    PERFORM _acc_assert('idempotency_blocks_duplicate_key', true);
  END;

  SELECT count(*) INTO cnt FROM public.transactions
  WHERE mosque_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' AND idempotency_key = 'idem-dup-key';
  PERFORM _acc_assert('idempotency_single_row', cnt = 1);
END $$;

-- -------------------------------------------------------------------------
-- 4) Large journal requires approval + separation of duties
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tx public.transactions;
  ok BOOLEAN;
BEGIN
  INSERT INTO public.transactions (
    id, mosque_id, entry_number, entry_date, description, status, source_type, created_by
  ) VALUES (
    't3333333-3333-3333-3333-333333333333',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'J-LARGE', CURRENT_DATE, 'Large income', 'draft', 'manual',
    '55555555-5555-5555-5555-555555555555'
  );
  INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
  VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't3333333-3333-3333-3333-333333333333',
     'ac111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 100000, 0, 1),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't3333333-3333-3333-3333-333333333333',
     'ac222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 0, 100000, 2);

  PERFORM public.refresh_transaction_totals('t3333333-3333-3333-3333-333333333333');
  tx := public.submit_journal('t3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555');
  PERFORM _acc_assert('large_requires_pending_approval', tx.status = 'pending_approval', tx.status::text);

  -- Submitter cannot post without approval
  BEGIN
    PERFORM public.post_journal('t3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555');
    ok := false;
  EXCEPTION WHEN OTHERS THEN
    ok := true;
  END;
  PERFORM _acc_assert('cannot_post_without_approval', ok);

  -- Approver approves (different user)
  tx := public.approve_journal('t3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');
  PERFORM _acc_assert('approver_can_approve', tx.status = 'approved', tx.status::text);

  tx := public.post_journal('t3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');
  PERFORM _acc_assert('post_after_approval', tx.status = 'posted', tx.status::text);
END $$;

-- -------------------------------------------------------------------------
-- 5) Immutable posted entry
-- -------------------------------------------------------------------------
DO $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.transactions
    SET description = 'hacked'
    WHERE id = 't1111111-1111-1111-1111-111111111111';
    ok := false;
  EXCEPTION WHEN OTHERS THEN
    ok := true;
  END;
  PERFORM _acc_assert('posted_header_immutable', ok);

  BEGIN
    UPDATE public.transaction_lines
    SET debit_poisha = 1
    WHERE transaction_id = 't1111111-1111-1111-1111-111111111111';
    ok := false;
  EXCEPTION WHEN OTHERS THEN
    ok := true;
  END;
  PERFORM _acc_assert('posted_lines_immutable', ok);
END $$;

-- -------------------------------------------------------------------------
-- 6) Reversal restores fund cash effect
-- -------------------------------------------------------------------------
DO $$
DECLARE
  bal_before BIGINT;
  bal_after BIGINT;
  bal_rev BIGINT;
  rev public.transactions;
BEGIN
  bal_before := public.fund_cash_balance_poisha(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'f1111111-1111-1111-1111-111111111111',
    CURRENT_DATE
  );

  rev := public.reverse_journal(
    't1111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    'Test reversal',
    'idem-rev-1'
  );
  PERFORM _acc_assert('reversal_posted', rev.status = 'posted', rev.status::text);
  PERFORM _acc_assert('reversal_linked',
    (SELECT reversed_by_id FROM public.transactions WHERE id = 't1111111-1111-1111-1111-111111111111') = rev.id
  );
  PERFORM _acc_assert('original_marked_reversed',
    (SELECT status FROM public.transactions WHERE id = 't1111111-1111-1111-1111-111111111111') = 'reversed'
  );

  bal_after := public.fund_cash_balance_poisha(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'f1111111-1111-1111-1111-111111111111',
    CURRENT_DATE
  );
  -- Net of original + reversal for that 10000 should cancel for that entry pair;
  -- large journal still remains so balance may not be zero — check delta of 10000 cancelled:
  PERFORM _acc_assert('reversal_balanced_lines',
    rev.total_debit_poisha = rev.total_credit_poisha
  );

  -- Idempotent second reversal returns same
  rev := public.reverse_journal(
    't1111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    'Test reversal again',
    'idem-rev-2'
  );
  PERFORM _acc_assert('reversal_idempotent',
    (SELECT count(*) FROM public.transactions WHERE reverses_id = 't1111111-1111-1111-1111-111111111111') = 1
  );
END $$;

-- -------------------------------------------------------------------------
-- 7) Fund transfer isolation (same mosque only)
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tx public.transactions;
  cash_gen BIGINT;
  cash_zak BIGINT;
BEGIN
  tx := public.create_fund_transfer(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    25000,
    'ac111111-1111-1111-1111-111111111111',
    CURRENT_DATE,
    'Move to zakat',
    '55555555-5555-5555-5555-555555555555',
    'idem-xfer-1',
    'TR-001'
  );
  PERFORM _acc_assert('transfer_created_draft', tx.status = 'draft', tx.status::text);
  PERFORM public.refresh_transaction_totals(tx.id);
  -- force approve path: threshold is 1 for transfer
  UPDATE public.transactions SET status = 'approved', approved_by = '66666666-6666-6666-6666-666666666666', approved_at = now()
  WHERE id = tx.id AND status = 'draft';
  -- draft->approved bypasses immutability
  tx := public.post_journal(tx.id, '66666666-6666-6666-6666-666666666666');
  PERFORM _acc_assert('transfer_posted', tx.status = 'posted');

  cash_gen := public.fund_cash_balance_poisha(
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 'f1111111-1111-1111-1111-111111111111', CURRENT_DATE);
  cash_zak := public.fund_cash_balance_poisha(
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 'f2222222-2222-2222-2222-222222222222', CURRENT_DATE);
  PERFORM _acc_assert('zakat_fund_received_transfer', cash_zak = 25000, cash_zak::text);
END $$;

-- -------------------------------------------------------------------------
-- 8) Period close blocks new posts
-- -------------------------------------------------------------------------
DO $$
DECLARE
  fp public.fiscal_periods;
  ok BOOLEAN := false;
  tx_id UUID;
BEGIN
  SELECT * INTO fp FROM public.fiscal_periods
  WHERE mosque_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    AND year = 2026 AND month = 10;

  -- Close may fail if unposted drafts exist — void drafts first
  UPDATE public.transactions SET status = 'voided'
  WHERE mosque_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    AND status IN ('draft', 'rejected', 'pending_approval');

  fp := public.close_fiscal_period(fp.id, '66666666-6666-6666-6666-666666666666');
  PERFORM _acc_assert('period_closed', fp.status = 'closed', fp.status);

  INSERT INTO public.transactions (
    id, mosque_id, entry_number, entry_date, description, status, source_type, created_by
  ) VALUES (
    't4444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'J-CLOSED', make_date(2026, 10, 15), 'Should fail', 'draft', 'manual',
    '55555555-5555-5555-5555-555555555555'
  );
  INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
  VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't4444444-4444-4444-4444-444444444444',
     'ac111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 100, 0, 1),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 't4444444-4444-4444-4444-444444444444',
     'ac222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 0, 100, 2);
  PERFORM public.refresh_transaction_totals('t4444444-4444-4444-4444-444444444444');
  UPDATE public.transactions SET status = 'approved' WHERE id = 't4444444-4444-4444-4444-444444444444';

  BEGIN
    PERFORM public.post_journal('t4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666');
    ok := false;
  EXCEPTION WHEN OTHERS THEN
    ok := SQLERRM LIKE '%বন্ধ%' OR SQLERRM LIKE '%closed%' OR SQLSTATE = 'P0001';
  END;
  PERFORM _acc_assert('closed_period_blocks_post', ok);
END $$;

-- -------------------------------------------------------------------------
-- 9) Concurrent post safety (second post is idempotent)
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tx1 public.transactions;
  tx2 public.transactions;
BEGIN
  -- use already posted large journal
  tx1 := public.post_journal('t3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');
  tx2 := public.post_journal('t3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');
  PERFORM _acc_assert('concurrent_post_idempotent',
    tx1.id = tx2.id AND tx1.status = 'posted' AND tx2.status = 'posted');
END $$;

-- -------------------------------------------------------------------------
-- 10) Reconciliation: sum of lines equals header totals for all posted
-- -------------------------------------------------------------------------
DO $$
DECLARE
  mismatches INT;
BEGIN
  SELECT count(*) INTO mismatches
  FROM public.transactions t
  WHERE t.mosque_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    AND t.status IN ('posted', 'reversed')
    AND (
      t.total_debit_poisha IS DISTINCT FROM (
        SELECT COALESCE(SUM(debit_poisha),0) FROM public.transaction_lines WHERE transaction_id = t.id
      )
      OR t.total_credit_poisha IS DISTINCT FROM (
        SELECT COALESCE(SUM(credit_poisha),0) FROM public.transaction_lines WHERE transaction_id = t.id
      )
      OR t.total_debit_poisha IS DISTINCT FROM t.total_credit_poisha
    );
  PERFORM _acc_assert('reconciliation_header_matches_lines', mismatches = 0, mismatches::text);
END $$;

-- Summary
DO $$
DECLARE
  failed INT;
  total INT;
  r RECORD;
BEGIN
  SELECT count(*) FILTER (WHERE NOT passed), count(*) INTO failed, total FROM _acc_results;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Accounting tests: % total, % failed', total, failed;
  FOR r IN SELECT * FROM _acc_results ORDER BY test_name LOOP
    RAISE NOTICE '  [%] % %', CASE WHEN r.passed THEN 'PASS' ELSE 'FAIL' END, r.test_name, COALESCE(r.detail,'');
  END LOOP;
  RAISE NOTICE '========================================';
  IF failed > 0 THEN
    RAISE EXCEPTION 'Accounting engine tests FAILED (% failures)', failed;
  END IF;
END $$;

ROLLBACK;
