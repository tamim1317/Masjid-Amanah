-- Masjid Amanah — Invitations, profile bootstrap, elevation guards, membership audit
-- Migration: 20261023000007

-- ---------------------------------------------------------------------------
-- Invitations (email/phone based; accepted → membership)
-- ---------------------------------------------------------------------------
CREATE TABLE public.mosque_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  email           TEXT,
  phone           TEXT,
  roles           public.mosque_role[] NOT NULL DEFAULT ARRAY['viewer']::public.mosque_role[],
  token_hash      TEXT NOT NULL, -- store hash only, never plaintext token
  invited_by      UUID NOT NULL REFERENCES public.profiles (id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  accepted_by     UUID REFERENCES public.profiles (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mosque_invitations_contact CHECK (email IS NOT NULL OR phone IS NOT NULL),
  -- Platform role must never appear in invitation roles
  CONSTRAINT mosque_invitations_no_empty_roles CHECK (cardinality(roles) >= 1)
);

CREATE UNIQUE INDEX mosque_invitations_pending_token_hash
  ON public.mosque_invitations (token_hash)
  WHERE status = 'pending';

CREATE INDEX mosque_invitations_mosque_status_idx
  ON public.mosque_invitations (mosque_id, status);

CREATE TRIGGER mosque_invitations_set_updated_at
  BEFORE UPDATE ON public.mosque_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Prevent client-side elevation of is_platform_admin
-- Only service_role / superuser may change this flag (enforced in trigger
-- when current_user is authenticated app role).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_platform_admin_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    -- Allow only when session has no JWT (service / migration) or is_platform_admin already
    IF auth.uid() IS NOT NULL
       AND NOT COALESCE(
         (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()),
         false
       ) THEN
      RAISE EXCEPTION 'platform_admin_elevation_denied'
        USING ERRCODE = '42501',
              MESSAGE = 'প্ল্যাটফর্ম অ্যাডমিন পদ নিজে থেকে নেওয়া যায় না';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_platform_admin = true AND auth.uid() IS NOT NULL THEN
    IF NOT COALESCE(
      (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()),
      false
    ) THEN
      RAISE EXCEPTION 'platform_admin_elevation_denied'
        USING ERRCODE = '42501',
              MESSAGE = 'প্ল্যাটফর্ম অ্যাডমিন পদ নিজে থেকে নেওয়া যায় না';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_platform_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_elevation();

-- ---------------------------------------------------------------------------
-- Membership role change: cannot grant roles you do not hold (except platform admin)
-- Admin may grant any mosque role. Non-admin cannot grant admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_membership_role_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  actor_is_platform BOOLEAN;
  actor_is_admin BOOLEAN;
BEGIN
  IF actor IS NULL THEN
    -- service_role / migration path
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_platform_admin, false) INTO actor_is_platform
  FROM public.profiles p WHERE p.id = actor;

  IF actor_is_platform THEN
    RETURN NEW;
  END IF;

  actor_is_admin := public.has_mosque_role(NEW.mosque_id, 'admin');

  IF NOT actor_is_admin AND NOT public.is_mosque_member(NEW.mosque_id) THEN
    RAISE EXCEPTION 'membership_forbidden'
      USING ERRCODE = '42501',
            MESSAGE = 'এই মসজিদের সদস্যপদ পরিবর্তনের অনুমতি নেই';
  END IF;

  -- Only mosque admin (or platform) may assign admin role
  IF 'admin' = ANY (NEW.roles) AND NOT actor_is_admin THEN
    RAISE EXCEPTION 'role_escalation_denied'
      USING ERRCODE = '42501',
            MESSAGE = 'অ্যাডমিন ভূমিকা দেওয়ার অনুমতি নেই';
  END IF;

  -- Users cannot edit their own roles to escalate
  IF NEW.user_id = actor AND OLD.roles IS DISTINCT FROM NEW.roles AND NOT actor_is_admin THEN
    RAISE EXCEPTION 'self_role_change_denied'
      USING ERRCODE = '42501',
            MESSAGE = 'নিজের ভূমিকা পরিবর্তন করা যায় না';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER memberships_guard_role_grant
  BEFORE INSERT OR UPDATE ON public.mosque_memberships
  FOR EACH ROW EXECUTE FUNCTION public.guard_membership_role_grant();

-- ---------------------------------------------------------------------------
-- Audit membership / role changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'membership.created';
    INSERT INTO public.audit_logs (
      mosque_id, actor_user_id, action, entity_type, entity_id, new_values
    ) VALUES (
      NEW.mosque_id, auth.uid(), action_name, 'mosque_memberships', NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      action_name := 'membership.status_changed';
    ELSIF OLD.roles IS DISTINCT FROM NEW.roles THEN
      action_name := 'membership.roles_changed';
    ELSE
      action_name := 'membership.updated';
    END IF;
    INSERT INTO public.audit_logs (
      mosque_id, actor_user_id, action, entity_type, entity_id, old_values, new_values
    ) VALUES (
      NEW.mosque_id, auth.uid(), action_name, 'mosque_memberships', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      mosque_id, actor_user_id, action, entity_type, entity_id, old_values
    ) VALUES (
      OLD.mosque_id, auth.uid(), 'membership.deleted', 'mosque_memberships', OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.mosque_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_membership_change();

-- ---------------------------------------------------------------------------
-- RLS for invitations
-- ---------------------------------------------------------------------------
ALTER TABLE public.mosque_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mosque_invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY invitations_select_admin
  ON public.mosque_invitations FOR SELECT TO authenticated
  USING (
    public.is_mosque_admin(mosque_id)
    OR public.is_platform_admin()
    OR (
      status = 'pending'
      AND (
        (email IS NOT NULL AND email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()))
        OR (phone IS NOT NULL AND phone = (SELECT p.phone FROM public.profiles p WHERE p.id = auth.uid()))
      )
    )
  );

CREATE POLICY invitations_insert_admin
  ON public.mosque_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY invitations_update_admin_or_accept
  ON public.mosque_invitations FOR UPDATE TO authenticated
  USING (
    public.is_mosque_admin(mosque_id)
    OR public.is_platform_admin()
    OR status = 'pending'
  )
  WITH CHECK (
    public.is_mosque_admin(mosque_id)
    OR public.is_platform_admin()
    OR status IN ('pending', 'accepted')
  );

CREATE POLICY invitations_delete_admin
  ON public.mosque_invitations FOR DELETE TO authenticated
  USING (public.is_mosque_admin(mosque_id) OR public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_invitations TO authenticated;
GRANT ALL ON public.mosque_invitations TO service_role;

-- ---------------------------------------------------------------------------
-- Optional: bootstrap profile when auth.users exists (Supabase)
-- Safe no-op if auth.users is not a real table with triggers allowed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, is_platform_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger only if auth.users exists as a table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auth.users trigger skipped: %', SQLERRM;
END $$;
