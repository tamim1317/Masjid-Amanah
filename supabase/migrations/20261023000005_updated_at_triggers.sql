-- Masjid Amanah — updated_at maintenance
-- Migration: 20261023000005

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mosques_set_updated_at
  BEFORE UPDATE ON public.mosques
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER mosque_memberships_set_updated_at
  BEFORE UPDATE ON public.mosque_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER funds_set_updated_at
  BEFORE UPDATE ON public.funds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER approvals_set_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
