-- Public reporting: access control, no drafts, reconciliation, date bounds
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/04_public_reporting.sql

BEGIN;

CREATE TEMP TABLE _pub_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  detail TEXT
);

CREATE OR REPLACE FUNCTION _pub_assert(p_name TEXT, p_ok BOOLEAN, p_detail TEXT DEFAULT '')
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _pub_results VALUES (p_name, p_ok, p_detail)
  ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
  IF p_ok THEN RAISE NOTICE 'PASS: %', p_name; ELSE RAISE WARNING 'FAIL: % — %', p_name, p_detail; END IF;
END;
$$;

SET ROLE NONE;

INSERT INTO public.mosques (id, slug, name_bn, status, public_profile_enabled)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'public-report-mosque', 'পাবলিক রিপোর্ট', 'active', true);

INSERT INTO public.profiles (id, email, full_name) VALUES
  ('77777777-7777-7777-7777-777777777777', 'pubadmin@test.local', 'Pub Admin');

INSERT INTO public.mosque_memberships (mosque_id, user_id, roles, status, accepted_at)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777',
  ARRAY['admin','treasurer']::public.mosque_role[], 'active', now());

INSERT INTO public.funds (id, mosque_id, code, name_bn, restriction_type, publish_status) VALUES
  ('fpub0001-0001-0001-0001-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'GENERAL', 'সাধারণ', 'unrestricted', 'published'),
  ('fpub0002-0002-0002-0002-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'PRIVATE', 'অপ্রকাশিত', 'restricted', 'draft');

INSERT INTO public.accounts (id, mosque_id, code, name_bn, type) VALUES
  ('apub0001-0001-0001-0001-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '1100', 'Cash', 'asset'),
  ('apub0002-0002-0002-0002-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '4100', 'Income', 'income'),
  ('apub0003-0003-0003-0003-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '5100', 'Expense', 'expense');

-- Posted + published journal inside period
INSERT INTO public.transactions (
  id, mosque_id, entry_number, entry_date, description, status, source_type,
  publish_status, public_label_bn, total_debit_poisha, total_credit_poisha,
  posted_at, posted_by, created_by
) VALUES (
  'tpub0001-0001-0001-0001-000000000001',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'PUB-1', '2026-10-05', 'Internal secret note should not be only field',
  'posted', 'receipt', 'published', 'শুক্রবারের দান',
  20000, 20000, now(), '77777777-7777-7777-7777-777777777777',
  '77777777-7777-7777-7777-777777777777'
);

INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0001-0001-0001-0001-000000000001',
   'apub0001-0001-0001-0001-000000000001', 'fpub0001-0001-0001-0001-000000000001', 20000, 0, 1),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0001-0001-0001-0001-000000000001',
   'apub0002-0002-0002-0002-000000000002', 'fpub0001-0001-0001-0001-000000000001', 0, 20000, 2);

-- Draft journal (must NOT appear publicly)
INSERT INTO public.transactions (
  id, mosque_id, entry_number, entry_date, description, status, source_type,
  publish_status, total_debit_poisha, total_credit_poisha, created_by
) VALUES (
  'tpub0002-0002-0002-0002-000000000002',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'DRAFT-1', '2026-10-06', 'Draft hidden', 'draft', 'manual', 'draft',
  5000, 5000, '77777777-7777-7777-7777-777777777777'
);

-- Posted but NOT published
INSERT INTO public.transactions (
  id, mosque_id, entry_number, entry_date, description, status, source_type,
  publish_status, total_debit_poisha, total_credit_poisha, posted_at, created_by
) VALUES (
  'tpub0003-0003-0003-0003-000000000003',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'PRIV-1', '2026-10-07', 'Posted private', 'posted', 'manual', 'draft',
  8000, 8000, now(), '77777777-7777-7777-7777-777777777777'
);

INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0003-0003-0003-0003-000000000003',
   'apub0001-0001-0001-0001-000000000001', 'fpub0001-0001-0001-0001-000000000001', 8000, 0, 1),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0003-0003-0003-0003-000000000003',
   'apub0002-0002-0002-0002-000000000002', 'fpub0001-0001-0001-0001-000000000001', 0, 8000, 2);

-- Outside date range
INSERT INTO public.transactions (
  id, mosque_id, entry_number, entry_date, description, status, source_type,
  publish_status, total_debit_poisha, total_credit_poisha, posted_at, created_by
) VALUES (
  'tpub0004-0004-0004-0004-000000000004',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'OLD-1', '2026-01-15', 'Old year', 'posted', 'receipt', 'published',
  1000, 1000, now(), '77777777-7777-7777-7777-777777777777'
);

INSERT INTO public.transaction_lines (mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0004-0004-0004-0004-000000000004',
   'apub0001-0001-0001-0001-000000000001', 'fpub0001-0001-0001-0001-000000000001', 1000, 0, 1),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tpub0004-0004-0004-0004-000000000004',
   'apub0002-0002-0002-0002-000000000002', 'fpub0001-0001-0001-0001-000000000001', 0, 1000, 2);

-- Private attachment vs public
INSERT INTO public.attachments (id, mosque_id, entity_type, entity_id, storage_path, file_name, is_public)
VALUES
  ('att00001-0001-0001-0001-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'transactions', 'tpub0001-0001-0001-0001-000000000001',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/private/secret.pdf', 'secret.pdf', false),
  ('att00002-0002-0002-0002-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'transactions', 'tpub0001-0001-0001-0001-000000000001',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/public/summary.pdf', 'summary.pdf', true);

-- Period totals: only published posted in range
DO $$
DECLARE
  t RECORD;
BEGIN
  SELECT * INTO t FROM public.public_period_totals(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-10-01', '2026-10-31'
  );
  PERFORM _pub_assert('income_only_published_in_range', t.income_poisha = 20000, t.income_poisha::text);
END $$;

-- Fund list excludes unpublished funds
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.public_fund_totals(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-10-01', '2026-10-31'
  );
  PERFORM _pub_assert('only_published_funds', cnt = 1, cnt::text);
END $$;

-- Transaction list excludes draft and unpublished
DO $$
DECLARE
  cnt INT;
  labels TEXT;
BEGIN
  SELECT count(*) INTO cnt FROM public.public_transaction_list(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-10-01', '2026-10-31', NULL, NULL, 50, 0
  );
  PERFORM _pub_assert('tx_list_only_published_posted', cnt = 1, cnt::text);

  SELECT string_agg(label_bn, ',') INTO labels FROM public.public_transaction_list(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-10-01', '2026-10-31', NULL, NULL, 50, 0
  );
  PERFORM _pub_assert('uses_public_label', labels LIKE '%শুক্রবারের দান%', labels);
END $$;

-- Date boundary: January not in October range
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.public_transaction_list(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-10-01', '2026-10-31',
    NULL, 'OLD', 50, 0
  );
  PERFORM _pub_assert('date_boundary_excludes_old', cnt = 0, cnt::text);
END $$;

-- Attachments: only public flag
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.public_attachments_for_entity(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'transactions',
    'tpub0001-0001-0001-0001-000000000001'
  );
  PERFORM _pub_assert('private_attachment_hidden', cnt = 1, cnt::text);
  PERFORM _pub_assert('public_attachment_name',
    (SELECT file_name FROM public.public_attachments_for_entity(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'transactions',
      'tpub0001-0001-0001-0001-000000000001'
    ) LIMIT 1) = 'summary.pdf'
  );
END $$;

-- Publish report + reconcile
DO $$
DECLARE
  rid UUID;
  rep public.published_reports;
  v RECORD;
BEGIN
  INSERT INTO public.published_reports (
    id, mosque_id, period_type, period_year, period_month,
    period_start, period_end, title_bn, status, revision, created_by
  ) VALUES (
    'rpub0001-0001-0001-0001-000000000001',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'month', 2026, 10, '2026-10-01', '2026-10-31',
    'অক্টোবর ২০২৬ প্রতিবেদন', 'draft', 1,
    '77777777-7777-7777-7777-777777777777'
  ) RETURNING id INTO rid;

  rep := public.publish_financial_report(rid, '77777777-7777-7777-7777-777777777777');
  PERFORM _pub_assert('report_published', rep.status = 'published', rep.status::text);
  PERFORM _pub_assert('report_has_checksum', length(rep.ledger_checksum) > 0);

  SELECT * INTO v FROM public.verify_report_reconciliation(rid);
  PERFORM _pub_assert('report_reconciles_with_ledger', v.matches, 
    format('snap=%s live=%s', v.snapshot_checksum, v.live_checksum));
END $$;

-- Anon cannot see draft reports via RLS (simulate)
SET ROLE anon;
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.published_reports
  WHERE mosque_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND status = 'draft';
  PERFORM _pub_assert('anon_cannot_see_draft_reports', cnt = 0, cnt::text);

  SELECT count(*) INTO cnt FROM public.published_reports
  WHERE mosque_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND status = 'published';
  PERFORM _pub_assert('anon_sees_published_reports', cnt >= 1, cnt::text);
END $$;

RESET ROLE;

DO $$
DECLARE
  failed INT;
  total INT;
  r RECORD;
BEGIN
  SELECT count(*) FILTER (WHERE NOT passed), count(*) INTO failed, total FROM _pub_results;
  RAISE NOTICE 'Public reporting tests: % total, % failed', total, failed;
  FOR r IN SELECT * FROM _pub_results ORDER BY test_name LOOP
    RAISE NOTICE '  [%] % %', CASE WHEN r.passed THEN 'PASS' ELSE 'FAIL' END, r.test_name, COALESCE(r.detail,'');
  END LOOP;
  IF failed > 0 THEN
    RAISE EXCEPTION 'Public reporting tests FAILED';
  END IF;
END $$;

ROLLBACK;
