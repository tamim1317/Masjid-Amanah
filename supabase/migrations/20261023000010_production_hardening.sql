-- Production hardening: attachment path integrity, public attachment access
-- Migration: 20261023000010

-- Storage path must be prefixed with mosque_id to reduce cross-tenant path guessing
ALTER TABLE public.attachments
  DROP CONSTRAINT IF EXISTS attachments_path_mosque_prefix;

ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_path_mosque_prefix
  CHECK (storage_path LIKE (mosque_id::text || '/%'));

-- Anon may only see explicitly public attachments of public mosques
DROP POLICY IF EXISTS attachments_select_public ON public.attachments;
CREATE POLICY attachments_select_public
  ON public.attachments FOR SELECT TO anon, authenticated
  USING (
    is_public = true
    AND public.is_mosque_publicly_visible(mosque_id)
  );

-- Members still see all attachments of their mosque (including private)
-- existing attachments_select_member covers that

-- Restrict audit_log insert to admin/treasurer/approver (reduce spam surface)
DROP POLICY IF EXISTS audit_logs_insert_member ON public.audit_logs;
CREATE POLICY audit_logs_insert_privileged
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    (
      mosque_id IS NOT NULL
      AND actor_user_id = auth.uid()
      AND (
        public.is_mosque_admin(mosque_id)
        OR public.can_manage_accounting(mosque_id)
        OR public.can_approve(mosque_id)
      )
    )
    OR public.is_platform_admin()
  );

-- Ensure FORCE RLS remains on sensitive tables
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.published_reports FORCE ROW LEVEL SECURITY;
