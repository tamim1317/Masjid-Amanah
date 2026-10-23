-- Masjid Amanah — Database roles & table grants (Supabase-compatible)
-- Migration: 20261023000006
-- Supabase provides anon / authenticated / service_role. Locally we create them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Table privileges: RLS still applies for anon/authenticated.
-- service_role bypasses RLS (server-side only — never expose to browser).

GRANT SELECT ON public.mosques TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosques TO authenticated;
GRANT ALL ON public.mosques TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_memberships TO authenticated;
GRANT ALL ON public.mosque_memberships TO service_role;

GRANT SELECT ON public.funds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.funds TO authenticated;
GRANT ALL ON public.funds TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

GRANT SELECT ON public.transactions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.transactions TO authenticated;
-- intentional: no DELETE grant on transactions for authenticated
GRANT ALL ON public.transactions TO service_role;

GRANT SELECT ON public.transaction_lines TO anon, authenticated;
GRANT INSERT, UPDATE ON public.transaction_lines TO authenticated;
GRANT ALL ON public.transaction_lines TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;

GRANT SELECT, INSERT, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
-- no UPDATE/DELETE for authenticated on audit_logs
GRANT ALL ON public.audit_logs TO service_role;

-- Sequences if any (uuid defaults don't need them)
