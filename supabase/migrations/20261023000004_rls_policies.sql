-- Masjid Amanah — Row Level Security policies
-- Migration: 20261023000004
-- Principle: ENABLE RLS + no policy = deny. Never add permissive open policies.

-- ---------------------------------------------------------------------------
-- Enable RLS on every sensitive table
-- ---------------------------------------------------------------------------
ALTER TABLE public.mosques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mosque_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (except superuser / bypass roles)
ALTER TABLE public.mosques FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mosque_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.funds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- mosques
-- SELECT: public active+enabled mosques (limited columns enforced in views later);
--         members can see their mosques; platform admin all
-- INSERT/UPDATE/DELETE: platform admin only (mosque create is ops action)
-- ---------------------------------------------------------------------------
CREATE POLICY mosques_select_public
  ON public.mosques FOR SELECT TO anon, authenticated
  USING (status = 'active' AND public_profile_enabled = true);

CREATE POLICY mosques_select_member
  ON public.mosques FOR SELECT TO authenticated
  USING (public.is_mosque_member(id) OR public.is_platform_admin());

CREATE POLICY mosques_insert_platform
  ON public.mosques FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY mosques_update_admin_or_platform
  ON public.mosques FOR UPDATE TO authenticated
  USING (public.is_mosque_admin(id) OR public.is_platform_admin())
  WITH CHECK (public.is_mosque_admin(id) OR public.is_platform_admin());

CREATE POLICY mosques_delete_platform
  ON public.mosques FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- Users read/update self; platform admin read all; no public list
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_self_or_platform
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin());

-- Members of same mosque can see basic profile of co-members (needed for UI)
CREATE POLICY profiles_select_same_mosque
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mosque_memberships me
      JOIN public.mosque_memberships them
        ON them.mosque_id = me.mosque_id
       AND them.status = 'active'
      WHERE me.user_id = auth.uid()
        AND me.status = 'active'
        AND them.user_id = profiles.id
    )
  );

CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- cannot self-elevate to platform admin
    AND is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY profiles_insert_self
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND is_platform_admin = false);

-- ---------------------------------------------------------------------------
-- mosque_memberships
-- ---------------------------------------------------------------------------
CREATE POLICY memberships_select_member_or_platform
  ON public.mosque_memberships FOR SELECT TO authenticated
  USING (
    public.is_mosque_member(mosque_id)
    OR user_id = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY memberships_insert_admin
  ON public.mosque_memberships FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_admin(mosque_id) OR public.is_platform_admin());

CREATE POLICY memberships_update_admin
  ON public.mosque_memberships FOR UPDATE TO authenticated
  USING (public.is_mosque_admin(mosque_id) OR public.is_platform_admin())
  WITH CHECK (public.is_mosque_admin(mosque_id) OR public.is_platform_admin());

CREATE POLICY memberships_delete_admin
  ON public.mosque_memberships FOR DELETE TO authenticated
  USING (public.is_mosque_admin(mosque_id) OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- funds
-- Public: only published funds of publicly visible mosques
-- Members with financial view: all funds of their mosque
-- Write: admin (setup) or treasurer (limited — both can write for MVP fund CRUD by admin; treasurer view+)
-- ---------------------------------------------------------------------------
CREATE POLICY funds_select_public_published
  ON public.funds FOR SELECT TO anon, authenticated
  USING (
    publish_status = 'published'
    AND public.is_mosque_publicly_visible(mosque_id)
  );

CREATE POLICY funds_select_member_financial
  ON public.funds FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());

CREATE POLICY funds_insert_admin
  ON public.funds FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY funds_update_admin
  ON public.funds FOR UPDATE TO authenticated
  USING (public.is_mosque_admin(mosque_id))
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY funds_delete_admin
  ON public.funds FOR DELETE TO authenticated
  USING (public.is_mosque_admin(mosque_id));

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
CREATE POLICY accounts_select_financial
  ON public.accounts FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());

CREATE POLICY accounts_insert_admin
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY accounts_update_admin
  ON public.accounts FOR UPDATE TO authenticated
  USING (public.is_mosque_admin(mosque_id))
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY accounts_delete_admin
  ON public.accounts FOR DELETE TO authenticated
  USING (public.is_mosque_admin(mosque_id) AND is_system = false);

-- ---------------------------------------------------------------------------
-- transactions
-- Public: only published + posted of public mosques (optional transparency)
-- ---------------------------------------------------------------------------
CREATE POLICY transactions_select_public_published
  ON public.transactions FOR SELECT TO anon, authenticated
  USING (
    publish_status = 'published'
    AND status = 'posted'
    AND public.is_mosque_publicly_visible(mosque_id)
  );

CREATE POLICY transactions_select_financial
  ON public.transactions FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());

CREATE POLICY transactions_insert_accounting
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_accounting(mosque_id));

CREATE POLICY transactions_update_accounting
  ON public.transactions FOR UPDATE TO authenticated
  USING (public.can_manage_accounting(mosque_id))
  WITH CHECK (public.can_manage_accounting(mosque_id));

-- No DELETE policy for transactions → deny deletes for authenticated
-- (posted history preserved; service_role/migrations only for hard maintenance)

-- ---------------------------------------------------------------------------
-- transaction_lines
-- ---------------------------------------------------------------------------
CREATE POLICY transaction_lines_select_public_via_published_tx
  ON public.transaction_lines FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_lines.transaction_id
        AND t.publish_status = 'published'
        AND t.status = 'posted'
        AND public.is_mosque_publicly_visible(t.mosque_id)
    )
  );

CREATE POLICY transaction_lines_select_financial
  ON public.transaction_lines FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());

CREATE POLICY transaction_lines_insert_accounting
  ON public.transaction_lines FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_accounting(mosque_id));

CREATE POLICY transaction_lines_update_accounting
  ON public.transaction_lines FOR UPDATE TO authenticated
  USING (public.can_manage_accounting(mosque_id))
  WITH CHECK (public.can_manage_accounting(mosque_id));

-- No DELETE policy → deny

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------
CREATE POLICY approvals_select_relevant
  ON public.approvals FOR SELECT TO authenticated
  USING (
    public.can_approve(mosque_id)
    OR public.can_manage_accounting(mosque_id)
    OR requested_by = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY approvals_insert_accounting
  ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_accounting(mosque_id));

CREATE POLICY approvals_update_approver
  ON public.approvals FOR UPDATE TO authenticated
  USING (public.can_approve(mosque_id) OR public.is_platform_admin())
  WITH CHECK (public.can_approve(mosque_id) OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
CREATE POLICY attachments_select_member
  ON public.attachments FOR SELECT TO authenticated
  USING (public.is_mosque_member(mosque_id) OR public.is_platform_admin());

CREATE POLICY attachments_insert_member
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_member(mosque_id));

CREATE POLICY attachments_delete_admin
  ON public.attachments FOR DELETE TO authenticated
  USING (public.is_mosque_admin(mosque_id) OR uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_logs
-- SELECT: admin full; financial roles can read own mosque (read-only)
-- INSERT: any authenticated member of mosque (or platform)
-- No UPDATE/DELETE policies → immutable for app roles
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select_admin
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    (mosque_id IS NOT NULL AND public.is_mosque_admin(mosque_id))
    OR public.is_platform_admin()
  );

CREATE POLICY audit_logs_select_financial_readonly
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    mosque_id IS NOT NULL
    AND public.has_mosque_role(mosque_id, 'treasurer', 'approver', 'committee')
  );

CREATE POLICY audit_logs_insert_member
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    (
      mosque_id IS NOT NULL
      AND public.is_mosque_member(mosque_id)
      AND actor_user_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

-- Explicit comment: anon has ZERO policies on memberships, accounts, approvals,
-- attachments, audit_logs, and unpublished financial data → deny by default.
