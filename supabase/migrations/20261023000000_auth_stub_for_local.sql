-- Masjid Amanah — Minimal auth stub for local Postgres (non-Supabase) testing
-- Migration: 20261023000000
-- On real Supabase this is provided by the platform; this file is idempotent and
-- only creates auth.uid() if missing so RLS helpers work in CI/local Docker.

CREATE SCHEMA IF NOT EXISTS auth;

-- Session GUC used by tests: SET request.jwt.claim.sub = '<uuid>';
-- Supabase sets this from the JWT; locally we emulate via a helper.

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  sub TEXT;
BEGIN
  BEGIN
    sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    sub := NULL;
  END;

  IF sub IS NULL OR sub = '' THEN
    BEGIN
      sub := current_setting('request.jwt.claims', true)::json->>'sub';
    EXCEPTION WHEN OTHERS THEN
      sub := NULL;
    END;
  END IF;

  IF sub IS NULL OR sub = '' THEN
    RETURN NULL;
  END IF;

  RETURN sub::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION auth.uid() IS 'Returns current user UUID from JWT claims (Supabase-compatible). Local tests set request.jwt.claim.sub.';
