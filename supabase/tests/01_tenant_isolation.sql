-- Masjid Amanah — Tenant isolation tests
-- Run after migrations against an empty database.
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/01_tenant_isolation.sql
--
-- Synthetic UUIDs only. Never production data.
-- Proves: Mosque A user cannot read or modify Mosque B data under RLS.

BEGIN;

CREATE TEMP TABLE _test_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  detail TEXT
);

CREATE OR REPLACE FUNCTION _assert(p_name TEXT, p_condition BOOLEAN, p_detail TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO _test_results (test_name, passed, detail)
  VALUES (p_name, p_condition, p_detail)
  ON CONFLICT (test_name) DO UPDATE
    SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
  IF NOT p_condition THEN
    RAISE WARNING 'FAIL: % — %', p_name, p_detail;
  ELSE
    RAISE NOTICE 'PASS: %', p_name;
  END IF;
END;
$$;

SET ROLE NONE;

DO $$
DECLARE
  mosque_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  mosque_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  user_a   UUID := '11111111-1111-1111-1111-111111111111';
  user_b   UUID := '22222222-2222-2222-2222-222222222222';
  fund_a   UUID := 'f0000000-0000-0000-0000-00000000000a';
  fund_b   UUID := 'f0000000-0000-0000-0000-00000000000b';
  acct_a   UUID := 'a0000000-0000-0000-0000-00000000000a';
  acct_b   UUID := 'a0000000-0000-0000-0000-00000000000b';
  tx_a     UUID := 't0000000-0000-0000-0000-00000000000a';
  tx_b     UUID := 't0000000-0000-0000-0000-00000000000b';
BEGIN
  INSERT INTO public.mosques (id, slug, name_bn, name_en, status, public_profile_enabled)
  VALUES
    (mosque_a, 'mosque-a-test', 'মসজিদ এ', 'Mosque A', 'active', true),
    (mosque_b, 'mosque-b-test', 'মসজিদ বি', 'Mosque B', 'active', true);

  INSERT INTO public.profiles (id, email, full_name, is_platform_admin)
  VALUES
    (user_a, 'user-a@example.test', 'User A', false),
    (user_b, 'user-b@example.test', 'User B', false);

  INSERT INTO public.mosque_memberships (mosque_id, user_id, roles, status, accepted_at)
  VALUES
    (mosque_a, user_a, ARRAY['admin', 'treasurer']::public.mosque_role[], 'active', now()),
    (mosque_b, user_b, ARRAY['admin', 'treasurer']::public.mosque_role[], 'active', now());

  INSERT INTO public.funds (id, mosque_id, code, name_bn, restriction_type, publish_status)
  VALUES
    (fund_a, mosque_a, 'GENERAL', 'সাধারণ এ', 'unrestricted', 'published'),
    (fund_b, mosque_b, 'GENERAL', 'সাধারণ বি', 'unrestricted', 'draft');

  INSERT INTO public.accounts (id, mosque_id, code, name_bn, type, fund_id)
  VALUES
    (acct_a, mosque_a, '1000', 'Cash A', 'asset', fund_a),
    (acct_b, mosque_b, '1000', 'Cash B', 'asset', fund_b);

  INSERT INTO public.transactions (
    id, mosque_id, entry_number, entry_date, description, status, publish_status, created_by
  ) VALUES
    (tx_a, mosque_a, 'A-001', CURRENT_DATE, 'Secret A income', 'posted', 'draft', user_a),
    (tx_b, mosque_b, 'B-001', CURRENT_DATE, 'Secret B income', 'posted', 'draft', user_b);

  INSERT INTO public.transaction_lines (
    mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order
  ) VALUES
    (mosque_a, tx_a, acct_a, fund_a, 10000, 0, 1),
    (mosque_b, tx_b, acct_b, fund_b, 20000, 0, 1);

  INSERT INTO public.approvals (
    id, mosque_id, request_type, reference_id, amount_poisha, requested_by, status
  ) VALUES
    ('p0000000-0000-0000-0000-00000000000a', mosque_a, 'expense', tx_a, 10000, user_a, 'pending'),
    ('p0000000-0000-0000-0000-00000000000b', mosque_b, 'expense', tx_b, 20000, user_b, 'pending');
END $$;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SET ROLE authenticated;

SELECT _assert(
  'user_a_sees_own_mosque',
  (SELECT count(*) FROM public.mosques WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 1
);

SELECT _assert(
  'user_a_sees_own_funds',
  (SELECT count(*) FROM public.funds WHERE mosque_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') >= 1
);

SELECT _assert(
  'user_a_cannot_see_mosque_b_draft_fund',
  (SELECT count(*) FROM public.funds WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0,
  'User A must not see Mosque B draft funds'
);

SELECT _assert(
  'user_a_cannot_see_mosque_b_transactions',
  (SELECT count(*) FROM public.transactions WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0
);

SELECT _assert(
  'user_a_cannot_see_mosque_b_lines',
  (SELECT count(*) FROM public.transaction_lines WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0
);

SELECT _assert(
  'user_a_cannot_see_mosque_b_approvals',
  (SELECT count(*) FROM public.approvals WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0
);

SELECT _assert(
  'user_a_cannot_see_mosque_b_accounts',
  (SELECT count(*) FROM public.accounts WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0
);

DO $$
DECLARE
  denied BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.funds (mosque_id, code, name_bn)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'HACK', 'Hack');
    denied := false;
  EXCEPTION WHEN OTHERS THEN
    denied := true;
  END;
  PERFORM _assert('user_a_cannot_insert_fund_into_mosque_b', denied);
END $$;

DO $$
DECLARE
  ok BOOLEAN;
BEGIN
  UPDATE public.transactions
  SET description = 'hacked-by-a'
  WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  RESET ROLE;
  ok := (SELECT count(*) FROM public.transactions
         WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
           AND description = 'hacked-by-a') = 0;
  SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  SET ROLE authenticated;
  PERFORM _assert('user_a_cannot_update_mosque_b_transactions', ok);
END $$;

DO $$
DECLARE
  ok BOOLEAN;
  before_count INT;
BEGIN
  RESET ROLE;
  SELECT count(*) INTO before_count FROM public.funds
  WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  SET ROLE authenticated;
  BEGIN
    DELETE FROM public.funds WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RESET ROLE;
  ok := (SELECT count(*) FROM public.funds WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = before_count;
  SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  SET ROLE authenticated;
  PERFORM _assert('user_a_cannot_delete_mosque_b_funds', ok);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
SET ROLE authenticated;

SELECT _assert(
  'user_b_sees_own_transactions',
  (SELECT count(*) FROM public.transactions WHERE mosque_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 1
);

SELECT _assert(
  'user_b_cannot_see_mosque_a_transactions',
  (SELECT count(*) FROM public.transactions WHERE mosque_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0
);

SELECT _assert(
  'user_b_cannot_see_mosque_a_approvals',
  (SELECT count(*) FROM public.approvals WHERE mosque_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SET ROLE anon;

SELECT _assert(
  'anon_sees_published_fund_a',
  (SELECT count(*) FROM public.funds WHERE id = 'f0000000-0000-0000-0000-00000000000a') = 1
);

SELECT _assert(
  'anon_cannot_see_draft_fund_b',
  (SELECT count(*) FROM public.funds WHERE id = 'f0000000-0000-0000-0000-00000000000b') = 0
);

SELECT _assert(
  'anon_cannot_see_draft_transactions',
  (SELECT count(*) FROM public.transactions) = 0
);

SELECT _assert(
  'anon_cannot_see_memberships',
  (SELECT count(*) FROM public.mosque_memberships) = 0
);

SELECT _assert(
  'anon_cannot_see_approvals',
  (SELECT count(*) FROM public.approvals) = 0
);

SELECT _assert(
  'anon_cannot_see_audit_logs',
  (SELECT count(*) FROM public.audit_logs) = 0
);

RESET ROLE;

DO $$
DECLARE
  failed INT;
  total INT;
  r RECORD;
BEGIN
  SELECT count(*) FILTER (WHERE NOT passed), count(*)
  INTO failed, total
  FROM _test_results;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Isolation tests: % total, % failed', total, failed;
  FOR r IN SELECT test_name, passed, detail FROM _test_results ORDER BY test_name LOOP
    RAISE NOTICE '  [%] % %', CASE WHEN r.passed THEN 'PASS' ELSE 'FAIL' END, r.test_name, COALESCE(r.detail, '');
  END LOOP;
  RAISE NOTICE '========================================';

  IF failed > 0 THEN
    RAISE EXCEPTION 'Tenant isolation tests FAILED (% failures)', failed;
  END IF;
END $$;

ROLLBACK;
