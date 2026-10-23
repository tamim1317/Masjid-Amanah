-- Attachment access control tests
BEGIN;

CREATE TEMP TABLE _att_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL
);

CREATE OR REPLACE FUNCTION _att_assert(p_name TEXT, p_ok BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _att_results VALUES (p_name, p_ok)
  ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed;
  IF p_ok THEN RAISE NOTICE 'PASS: %', p_name; ELSE RAISE WARNING 'FAIL: %', p_name; END IF;
END;
$$;

SET ROLE NONE;

INSERT INTO public.mosques (id, slug, name_bn, status, public_profile_enabled)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'att-test-mosque', 'অ্যাটাচমেন্ট', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- Valid path
INSERT INTO public.attachments (
  id, mosque_id, entity_type, entity_id, storage_path, file_name, is_public
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'transactions', 'b1111111-1111-1111-1111-111111111111',
  'ffffffff-ffff-ffff-ffff-ffffffffffff/public/ok.pdf', 'ok.pdf', true
);

-- Invalid path prefix must fail
DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.attachments (
      mosque_id, entity_type, entity_id, storage_path, file_name, is_public
    ) VALUES (
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'transactions', 'b1111111-1111-1111-1111-111111111111',
      'other-tenant/secret.pdf', 'x.pdf', false
    );
    ok := false;
  EXCEPTION WHEN check_violation OR OTHERS THEN
    ok := true;
  END;
  PERFORM _att_assert('rejects_cross_tenant_storage_path', ok);
END $$;

-- Anon sees only public
SET ROLE anon;
DO $$
DECLARE cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.attachments
  WHERE mosque_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' AND is_public = false;
  PERFORM _att_assert('anon_cannot_list_private_attachments', cnt = 0);

  SELECT count(*) INTO cnt FROM public.attachments
  WHERE mosque_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' AND is_public = true;
  PERFORM _att_assert('anon_can_see_public_attachments', cnt >= 1);
END $$;

RESET ROLE;

DO $$
DECLARE failed INT;
BEGIN
  SELECT count(*) INTO failed FROM _att_results WHERE NOT passed;
  IF failed > 0 THEN RAISE EXCEPTION 'Attachment tests FAILED'; END IF;
END $$;

ROLLBACK;
