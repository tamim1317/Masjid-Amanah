-- Auth / role escalation DB tests
-- Requires migrations through 20261023000007
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/02_auth_escalation.sql

BEGIN;

CREATE TEMP TABLE _auth_test_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL
);

CREATE OR REPLACE FUNCTION _auth_assert(p_name TEXT, p_ok BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _auth_test_results VALUES (p_name, p_ok)
  ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed;
  IF p_ok THEN RAISE NOTICE 'PASS: %', p_name; ELSE RAISE WARNING 'FAIL: %', p_name; END IF;
END;
$$;

SET ROLE NONE;

-- Seed mosque + two users (treasurer tries to escalate)
INSERT INTO public.mosques (id, slug, name_bn, status, public_profile_enabled)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'mosque-c-test', 'মসজিদ সি', 'active', true);

INSERT INTO public.profiles (id, email, full_name, is_platform_admin) VALUES
  ('33333333-3333-3333-3333-333333333333', 'admin-c@example.test', 'Admin C', false),
  ('44444444-4444-4444-4444-444444444444', 'treas-c@example.test', 'Treas C', false);

INSERT INTO public.mosque_memberships (mosque_id, user_id, roles, status, accepted_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333',
   ARRAY['admin']::public.mosque_role[], 'active', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444',
   ARRAY['treasurer']::public.mosque_role[], 'active', now());

-- Treasurer attempts to grant self admin
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
SET ROLE authenticated;

DO $$
DECLARE
  denied BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.mosque_memberships
    SET roles = ARRAY['admin', 'treasurer']::public.mosque_role[]
    WHERE user_id = '44444444-4444-4444-4444-444444444444'
      AND mosque_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    denied := false;
  EXCEPTION WHEN OTHERS THEN
    denied := true;
  END;
  PERFORM _auth_assert('treasurer_cannot_self_escalate_to_admin', denied);
END $$;

-- Treasurer attempts to set is_platform_admin on own profile
DO $$
DECLARE
  denied BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.profiles
    SET is_platform_admin = true
    WHERE id = '44444444-4444-4444-4444-444444444444';
    denied := false;
  EXCEPTION WHEN OTHERS THEN
    denied := true;
  END;
  PERFORM _auth_assert('user_cannot_self_elevate_platform_admin', denied);
END $$;

-- Verify platform flag still false
RESET ROLE;
SELECT _auth_assert(
  'platform_flag_unchanged',
  (SELECT is_platform_admin FROM public.profiles
   WHERE id = '44444444-4444-4444-4444-444444444444') = false
);

-- Admin can change treasurer roles (as authenticated admin)
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
SET ROLE authenticated;

DO $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.mosque_memberships
    SET roles = ARRAY['treasurer', 'approver']::public.mosque_role[]
    WHERE user_id = '44444444-4444-4444-4444-444444444444'
      AND mosque_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    ok := true;
  EXCEPTION WHEN OTHERS THEN
    ok := false;
  END;
  PERFORM _auth_assert('admin_can_update_treasurer_roles', ok);
END $$;

-- Revoke membership then ensure status is revoked
DO $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.mosque_memberships
    SET status = 'revoked', revoked_at = now()
    WHERE user_id = '44444444-4444-4444-4444-444444444444'
      AND mosque_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    ok := true;
  EXCEPTION WHEN OTHERS THEN
    ok := false;
  END;
  PERFORM _auth_assert('admin_can_revoke_membership', ok);
END $$;

RESET ROLE;

DO $$
DECLARE
  failed INT;
BEGIN
  SELECT count(*) INTO failed FROM _auth_test_results WHERE NOT passed;
  RAISE NOTICE 'Auth escalation tests failed: %', failed;
  IF failed > 0 THEN
    RAISE EXCEPTION 'Auth escalation tests FAILED';
  END IF;
END $$;

ROLLBACK;
