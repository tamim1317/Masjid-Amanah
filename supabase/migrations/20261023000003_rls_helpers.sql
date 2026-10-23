-- Masjid Amanah — RLS helper functions
-- Migration: 20261023000003
-- SECURITY DEFINER helpers read membership without triggering recursive RLS.
-- All helpers are stable and grant EXECUTE only to authenticated (and service_role via superuser).

-- Current auth user id (null when anonymous / no JWT)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Platform operator flag
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

-- Active membership in a mosque
CREATE OR REPLACE FUNCTION public.is_mosque_member(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mosque_memberships m
    WHERE m.mosque_id = p_mosque_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

-- Membership has at least one of the given roles
CREATE OR REPLACE FUNCTION public.has_mosque_role(
  p_mosque_id UUID,
  VARIADIC p_roles public.mosque_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mosque_memberships m
    WHERE m.mosque_id = p_mosque_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.roles && p_roles
  );
$$;

-- Convenience role checks
CREATE OR REPLACE FUNCTION public.is_mosque_admin(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_mosque_role(p_mosque_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_accounting(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_mosque_role(p_mosque_id, 'admin', 'treasurer');
$$;

CREATE OR REPLACE FUNCTION public.can_approve(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_mosque_role(p_mosque_id, 'admin', 'approver');
$$;

CREATE OR REPLACE FUNCTION public.can_view_financials(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_mosque_role(
    p_mosque_id,
    'admin', 'treasurer', 'approver', 'committee', 'viewer'
  );
$$;

-- Mosque is active and public profile enabled (for anon public reads)
CREATE OR REPLACE FUNCTION public.is_mosque_publicly_visible(p_mosque_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mosques m
    WHERE m.id = p_mosque_id
      AND m.status = 'active'
      AND m.public_profile_enabled = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_mosque_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_mosque_role(UUID, VARIADIC public.mosque_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_mosque_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_accounting(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_approve(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_financials(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_mosque_publicly_visible(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_mosque_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_mosque_role(UUID, VARIADIC public.mosque_role[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_mosque_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_accounting(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_approve(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_financials(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_mosque_publicly_visible(UUID) TO authenticated, anon;

-- service_role bypasses RLS in Supabase; no extra grants required for helpers.
