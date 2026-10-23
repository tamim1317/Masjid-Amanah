-- Masjid Amanah — Public financial transparency & published reports
-- Migration: 20261023000009
-- All public figures derive from posted ledger rows only.

-- ---------------------------------------------------------------------------
-- Published report registry (with revision history)
-- ---------------------------------------------------------------------------
CREATE TYPE public.report_period_type AS ENUM ('month', 'year', 'custom');

CREATE TYPE public.report_publication_status AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'superseded',
  'withdrawn'
);

CREATE TABLE public.published_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id           UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  period_type         public.report_period_type NOT NULL,
  period_year         INT NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month        SMALLINT CHECK (period_month IS NULL OR period_month BETWEEN 1 AND 12),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  title_bn            TEXT NOT NULL,
  title_en            TEXT,
  status              public.report_publication_status NOT NULL DEFAULT 'draft',
  revision            INT NOT NULL DEFAULT 1 CHECK (revision >= 1),
  supersedes_id       UUID REFERENCES public.published_reports (id),
  -- Snapshot of totals at publication (audit); live pages still recompute from ledger
  snapshot_poisha     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Sorted list of contributing posted transaction ids (for reconciliation)
  ledger_tx_ids       UUID[] NOT NULL DEFAULT '{}',
  ledger_checksum     TEXT NOT NULL DEFAULT '',
  published_at        TIMESTAMPTZ,
  published_by        UUID REFERENCES public.profiles (id),
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES public.profiles (id),
  notes_public_bn     TEXT,
  notes_public_en     TEXT,
  created_by          UUID REFERENCES public.profiles (id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT published_reports_range CHECK (period_end >= period_start),
  CONSTRAINT published_reports_month_required CHECK (
    period_type <> 'month' OR period_month IS NOT NULL
  )
);

CREATE INDEX published_reports_mosque_status_idx
  ON public.published_reports (mosque_id, status, period_end DESC);

CREATE INDEX published_reports_mosque_period_idx
  ON public.published_reports (mosque_id, period_year, period_month);

CREATE TRIGGER published_reports_set_updated_at
  BEFORE UPDATE ON public.published_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Explicit opt-in for publishing individual journals / bills / receipts
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS public_label_bn TEXT,
  ADD COLUMN IF NOT EXISTS public_label_en TEXT;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS publish_status public.publish_status NOT NULL DEFAULT 'draft';

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS publish_status public.publish_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS public_payer_label TEXT; -- never store phone; optional display name only

ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Authoritative public aggregates (SECURITY DEFINER, posted + published only)
-- ---------------------------------------------------------------------------

-- Income / expense / transfer totals for a mosque in a date range
CREATE OR REPLACE FUNCTION public.public_period_totals(
  p_mosque_id UUID,
  p_start DATE,
  p_end DATE
) RETURNS TABLE (
  income_poisha BIGINT,
  expense_poisha BIGINT,
  transfer_poisha BIGINT,
  closing_cash_poisha BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH posted AS (
    SELECT t.id, t.source_type, t.entry_date
    FROM public.transactions t
    JOIN public.mosques m ON m.id = t.mosque_id
    WHERE t.mosque_id = p_mosque_id
      AND m.status = 'active'
      AND m.public_profile_enabled = true
      AND t.status = 'posted'
      AND t.publish_status = 'published'
      AND t.entry_date BETWEEN p_start AND p_end
  ),
  lines AS (
    SELECT tl.*, a.type AS account_type, p.source_type
    FROM public.transaction_lines tl
    JOIN posted p ON p.id = tl.transaction_id
    JOIN public.accounts a ON a.id = tl.account_id
  )
  SELECT
    COALESCE(SUM(CASE WHEN account_type = 'income'
      THEN credit_poisha - debit_poisha ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN account_type = 'expense'
      THEN debit_poisha - credit_poisha ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN source_type = 'transfer'
      THEN debit_poisha ELSE 0 END), 0)::BIGINT / 2, -- each transfer has equal debit+credit
    (
      SELECT COALESCE(SUM(tl2.debit_poisha - tl2.credit_poisha), 0)::BIGINT
      FROM public.transaction_lines tl2
      JOIN public.transactions t2 ON t2.id = tl2.transaction_id
      JOIN public.accounts a2 ON a2.id = tl2.account_id
      JOIN public.mosques m2 ON m2.id = t2.mosque_id
      WHERE t2.mosque_id = p_mosque_id
        AND m2.status = 'active' AND m2.public_profile_enabled = true
        AND t2.status = 'posted' AND t2.publish_status = 'published'
        AND t2.entry_date <= p_end
        AND a2.type = 'asset'
    )
  FROM lines;
$$;

-- Fund-level public summary (only published funds)
CREATE OR REPLACE FUNCTION public.public_fund_totals(
  p_mosque_id UUID,
  p_start DATE,
  p_end DATE
) RETURNS TABLE (
  fund_id UUID,
  fund_code TEXT,
  fund_name_bn TEXT,
  fund_name_en TEXT,
  restriction_type public.fund_restriction,
  income_poisha BIGINT,
  expense_poisha BIGINT,
  closing_cash_poisha BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.code,
    f.name_bn,
    f.name_en,
    f.restriction_type,
    COALESCE(SUM(CASE WHEN a.type = 'income'
      THEN tl.credit_poisha - tl.debit_poisha ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN a.type = 'expense'
      THEN tl.debit_poisha - tl.credit_poisha ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN a.type = 'asset' AND t.entry_date <= p_end
      THEN tl.debit_poisha - tl.credit_poisha ELSE 0 END), 0)::BIGINT
  FROM public.funds f
  JOIN public.mosques m ON m.id = f.mosque_id
  LEFT JOIN public.transaction_lines tl ON tl.fund_id = f.id
  LEFT JOIN public.transactions t ON t.id = tl.transaction_id
    AND t.status = 'posted'
    AND t.publish_status = 'published'
    AND t.entry_date BETWEEN p_start AND p_end
  LEFT JOIN public.accounts a ON a.id = tl.account_id
  WHERE f.mosque_id = p_mosque_id
    AND f.publish_status = 'published'
    AND f.is_active = true
    AND m.status = 'active'
    AND m.public_profile_enabled = true
  GROUP BY f.id, f.code, f.name_bn, f.name_en, f.restriction_type
  ORDER BY f.sort_order, f.code;
$$;

-- Public transaction list (safe columns only; no internal notes beyond public_label)
CREATE OR REPLACE FUNCTION public.public_transaction_list(
  p_mosque_id UUID,
  p_start DATE,
  p_end DATE,
  p_fund_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  transaction_id UUID,
  entry_date DATE,
  entry_number TEXT,
  source_type public.transaction_source,
  label_bn TEXT,
  label_en TEXT,
  amount_poisha BIGINT,
  fund_code TEXT,
  fund_name_bn TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.entry_date,
    t.entry_number,
    t.source_type,
    COALESCE(t.public_label_bn, t.description),
    COALESCE(t.public_label_en, t.description),
    t.total_debit_poisha,
    f.code,
    f.name_bn
  FROM public.transactions t
  JOIN public.mosques m ON m.id = t.mosque_id
  LEFT JOIN LATERAL (
    SELECT tl.fund_id
    FROM public.transaction_lines tl
    WHERE tl.transaction_id = t.id
    ORDER BY tl.line_order
    LIMIT 1
  ) first_line ON true
  LEFT JOIN public.funds f ON f.id = first_line.fund_id AND f.publish_status = 'published'
  WHERE t.mosque_id = p_mosque_id
    AND m.status = 'active'
    AND m.public_profile_enabled = true
    AND t.status = 'posted'
    AND t.publish_status = 'published'
    AND t.entry_date BETWEEN p_start AND p_end
    AND (p_fund_id IS NULL OR first_line.fund_id = p_fund_id)
    AND (
      p_search IS NULL OR p_search = ''
      OR t.entry_number ILIKE '%' || p_search || '%'
      OR COALESCE(t.public_label_bn, t.description) ILIKE '%' || p_search || '%'
      OR COALESCE(t.public_label_en, '') ILIKE '%' || p_search || '%'
    )
  ORDER BY t.entry_date DESC, t.entry_number DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
$$;

-- Build ledger checksum for a period (for publish reconciliation)
CREATE OR REPLACE FUNCTION public.compute_ledger_checksum(
  p_mosque_id UUID,
  p_start DATE,
  p_end DATE
) RETURNS TABLE (tx_ids UUID[], checksum TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ids AS (
    SELECT t.id
    FROM public.transactions t
    WHERE t.mosque_id = p_mosque_id
      AND t.status = 'posted'
      AND t.publish_status = 'published'
      AND t.entry_date BETWEEN p_start AND p_end
    ORDER BY t.id
  )
  SELECT
    COALESCE(array_agg(id), '{}'::UUID[]),
    COALESCE(md5(string_agg(id::text, ',')), md5(''))
  FROM ids;
$$;

-- Publish a report: snapshot + checksum must match live ledger
CREATE OR REPLACE FUNCTION public.publish_financial_report(
  p_report_id UUID,
  p_actor UUID
) RETURNS public.published_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rep public.published_reports;
  totals RECORD;
  chk RECORD;
  snap JSONB;
BEGIN
  SELECT * INTO rep FROM public.published_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF rep.status NOT IN ('draft', 'pending_approval') THEN
    RAISE EXCEPTION 'report_not_publishable' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO totals
  FROM public.public_period_totals(rep.mosque_id, rep.period_start, rep.period_end);

  SELECT * INTO chk
  FROM public.compute_ledger_checksum(rep.mosque_id, rep.period_start, rep.period_end);

  snap := jsonb_build_object(
    'income_poisha', totals.income_poisha,
    'expense_poisha', totals.expense_poisha,
    'transfer_poisha', totals.transfer_poisha,
    'closing_cash_poisha', totals.closing_cash_poisha,
    'generated_at', now()
  );

  -- Supersede previous published report for same period
  UPDATE public.published_reports
  SET status = 'superseded', updated_at = now()
  WHERE mosque_id = rep.mosque_id
    AND period_type = rep.period_type
    AND period_year = rep.period_year
    AND period_month IS NOT DISTINCT FROM rep.period_month
    AND status = 'published'
    AND id <> rep.id;

  UPDATE public.published_reports
  SET status = 'published',
      published_at = now(),
      published_by = p_actor,
      approved_at = COALESCE(approved_at, now()),
      approved_by = COALESCE(approved_by, p_actor),
      snapshot_poisha = snap,
      ledger_tx_ids = chk.tx_ids,
      ledger_checksum = chk.checksum,
      updated_at = now()
  WHERE id = p_report_id
  RETURNING * INTO rep;

  INSERT INTO public.audit_logs (
    mosque_id, actor_user_id, action, entity_type, entity_id, new_values
  ) VALUES (
    rep.mosque_id, p_actor, 'report.published', 'published_reports', rep.id, to_jsonb(rep)
  );

  RETURN rep;
END;
$$;

-- Verify published snapshot still matches live ledger
CREATE OR REPLACE FUNCTION public.verify_report_reconciliation(p_report_id UUID)
RETURNS TABLE (
  report_id UUID,
  matches BOOLEAN,
  snapshot_checksum TEXT,
  live_checksum TEXT,
  snapshot_income BIGINT,
  live_income BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rep public.published_reports;
  chk RECORD;
  totals RECORD;
BEGIN
  SELECT * INTO rep FROM public.published_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO chk
  FROM public.compute_ledger_checksum(rep.mosque_id, rep.period_start, rep.period_end);
  SELECT * INTO totals
  FROM public.public_period_totals(rep.mosque_id, rep.period_start, rep.period_end);

  report_id := rep.id;
  snapshot_checksum := rep.ledger_checksum;
  live_checksum := chk.checksum;
  snapshot_income := COALESCE((rep.snapshot_poisha->>'income_poisha')::BIGINT, 0);
  live_income := totals.income_poisha;
  matches := (rep.ledger_checksum = chk.checksum)
             AND (snapshot_income = live_income);
  RETURN NEXT;
END;
$$;

-- Public attachments: only is_public = true
CREATE OR REPLACE FUNCTION public.public_attachments_for_entity(
  p_mosque_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS TABLE (
  id UUID,
  file_name TEXT,
  content_type TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.file_name, a.content_type
  FROM public.attachments a
  JOIN public.mosques m ON m.id = a.mosque_id
  WHERE a.mosque_id = p_mosque_id
    AND a.entity_type = p_entity_type
    AND a.entity_id = p_entity_id
    AND a.is_public = true
    AND m.status = 'active'
    AND m.public_profile_enabled = true;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.published_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_reports FORCE ROW LEVEL SECURITY;

-- Anon/authenticated: only published rows of public mosques
CREATE POLICY published_reports_select_public
  ON public.published_reports FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND public.is_mosque_publicly_visible(mosque_id)
  );

CREATE POLICY published_reports_select_staff
  ON public.published_reports FOR SELECT TO authenticated
  USING (
    public.can_view_financials(mosque_id) OR public.is_platform_admin()
  );

CREATE POLICY published_reports_write_admin
  ON public.published_reports FOR ALL TO authenticated
  USING (public.is_mosque_admin(mosque_id) OR public.can_manage_accounting(mosque_id))
  WITH CHECK (public.is_mosque_admin(mosque_id) OR public.can_manage_accounting(mosque_id));

GRANT SELECT ON public.published_reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.published_reports TO authenticated;
GRANT ALL ON public.published_reports TO service_role;

GRANT EXECUTE ON FUNCTION public.public_period_totals(UUID, DATE, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_fund_totals(UUID, DATE, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_transaction_list(UUID, DATE, DATE, UUID, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_ledger_checksum(UUID, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_financial_report(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_report_reconciliation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_attachments_for_entity(UUID, TEXT, UUID) TO anon, authenticated, service_role;
