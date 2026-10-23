-- Masjid Amanah — Accounting engine
-- Migration: 20261023000008
-- Money: BIGINT poisha only. All posting is transactional and balanced.

-- ---------------------------------------------------------------------------
-- Extend enums (idempotent-safe pattern)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'submitted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'approved';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'reversed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'opening_balance';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'bill';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'adjustment';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'period_close';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.approval_request_type ADD VALUE IF NOT EXISTS 'bill';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.approval_request_type ADD VALUE IF NOT EXISTS 'journal';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Fiscal periods (monthly open/close)
-- ---------------------------------------------------------------------------
CREATE TABLE public.fiscal_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  year            INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  starts_on       DATE NOT NULL,
  ends_on         DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  closed_at       TIMESTAMPTZ,
  closed_by       UUID REFERENCES public.profiles (id),
  opening_equity_poisha BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_periods_mosque_ym_unique UNIQUE (mosque_id, year, month),
  CONSTRAINT fiscal_periods_range CHECK (ends_on >= starts_on)
);

CREATE INDEX fiscal_periods_mosque_status_idx
  ON public.fiscal_periods (mosque_id, status);

CREATE TRIGGER fiscal_periods_set_updated_at
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Enrich transactions for workflow + idempotency + denormalized totals
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES public.fiscal_periods (id),
  ADD COLUMN IF NOT EXISTS total_debit_poisha BIGINT NOT NULL DEFAULT 0
    CHECK (total_debit_poisha >= 0),
  ADD COLUMN IF NOT EXISTS total_credit_poisha BIGINT NOT NULL DEFAULT 0
    CHECK (total_credit_poisha >= 0),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles (id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles (id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles (id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Idempotency: one successful logical submission per key per mosque
CREATE UNIQUE INDEX IF NOT EXISTS transactions_mosque_idempotency_uidx
  ON public.transactions (mosque_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Approval thresholds (per mosque / request type)
-- amount in poisha; NULL threshold_poisha means always require approval
-- ---------------------------------------------------------------------------
CREATE TABLE public.approval_thresholds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  request_type      public.approval_request_type NOT NULL,
  threshold_poisha  BIGINT NOT NULL DEFAULT 0 CHECK (threshold_poisha >= 0),
  -- Separation of duties: poster cannot approve if true
  separate_duties   BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT approval_thresholds_mosque_type_unique UNIQUE (mosque_id, request_type)
);

CREATE TRIGGER approval_thresholds_set_updated_at
  BEFORE UPDATE ON public.approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bills (accounts payable style)
-- ---------------------------------------------------------------------------
CREATE TYPE public.bill_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'partially_paid',
  'paid',
  'voided'
);

CREATE TABLE public.bills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  bill_number       TEXT NOT NULL,
  vendor_name       TEXT NOT NULL DEFAULT '',
  bill_date         DATE NOT NULL,
  due_date          DATE,
  description       TEXT NOT NULL DEFAULT '',
  fund_id           UUID NOT NULL REFERENCES public.funds (id),
  expense_account_id UUID NOT NULL REFERENCES public.accounts (id),
  payable_account_id UUID NOT NULL REFERENCES public.accounts (id),
  amount_poisha     BIGINT NOT NULL CHECK (amount_poisha > 0),
  paid_poisha       BIGINT NOT NULL DEFAULT 0 CHECK (paid_poisha >= 0),
  status            public.bill_status NOT NULL DEFAULT 'draft',
  idempotency_key   TEXT,
  journal_id        UUID REFERENCES public.transactions (id),
  created_by        UUID REFERENCES public.profiles (id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bills_mosque_number_unique UNIQUE (mosque_id, bill_number),
  CONSTRAINT bills_paid_lte_amount CHECK (paid_poisha <= amount_poisha)
);

CREATE UNIQUE INDEX bills_mosque_idempotency_uidx
  ON public.bills (mosque_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX bills_mosque_status_idx ON public.bills (mosque_id, status);

CREATE TRIGGER bills_set_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bill_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  bill_id           UUID NOT NULL REFERENCES public.bills (id) ON DELETE RESTRICT,
  payment_date      DATE NOT NULL,
  amount_poisha     BIGINT NOT NULL CHECK (amount_poisha > 0),
  cash_account_id   UUID NOT NULL REFERENCES public.accounts (id),
  journal_id        UUID REFERENCES public.transactions (id),
  idempotency_key   TEXT,
  created_by        UUID REFERENCES public.profiles (id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bill_payments_mosque_idempotency_unique UNIQUE (mosque_id, idempotency_key)
);

CREATE INDEX bill_payments_bill_idx ON public.bill_payments (bill_id);

-- ---------------------------------------------------------------------------
-- Receipts (income acknowledgment linked to journal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  receipt_number    TEXT NOT NULL,
  receipt_date      DATE NOT NULL,
  payer_name        TEXT,
  amount_poisha     BIGINT NOT NULL CHECK (amount_poisha > 0),
  fund_id           UUID NOT NULL REFERENCES public.funds (id),
  journal_id        UUID REFERENCES public.transactions (id),
  idempotency_key   TEXT,
  created_by        UUID REFERENCES public.profiles (id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT receipts_mosque_number_unique UNIQUE (mosque_id, receipt_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS receipts_mosque_idempotency_uidx
  ON public.receipts (mosque_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Immutability: posted / reversed / voided journals cannot change lines
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_mutation_of_posted_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  st public.transaction_status;
BEGIN
  IF TG_TABLE_NAME = 'transaction_lines' THEN
    SELECT status INTO st FROM public.transactions
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    IF st IN ('posted', 'reversed', 'voided') THEN
      RAISE EXCEPTION 'posted_journal_immutable'
        USING ERRCODE = 'P0001',
              MESSAGE = 'পোস্টেড জার্নাল পরিবর্তন করা যায় না';
    END IF;
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    IF OLD.status IN ('posted', 'reversed', 'voided') THEN
      -- Allow only linking reversed_by_id / status→reversed via controlled functions
      IF TG_OP = 'UPDATE' THEN
        IF NEW.entry_date IS DISTINCT FROM OLD.entry_date
           OR NEW.description IS DISTINCT FROM OLD.description
           OR NEW.total_debit_poisha IS DISTINCT FROM OLD.total_debit_poisha
           OR NEW.total_credit_poisha IS DISTINCT FROM OLD.total_credit_poisha
           OR NEW.entry_number IS DISTINCT FROM OLD.entry_number
           OR NEW.mosque_id IS DISTINCT FROM OLD.mosque_id THEN
          RAISE EXCEPTION 'posted_journal_immutable'
            USING ERRCODE = 'P0001',
                  MESSAGE = 'পোস্টেড জার্নাল পরিবর্তন করা যায় না';
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'posted_journal_immutable'
          USING ERRCODE = 'P0001',
                MESSAGE = 'পোস্টেড জার্নাল মুছে ফেলা যায় না';
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS transactions_immutable_posted_trg ON public.transactions;
CREATE TRIGGER transactions_immutable_posted_trg
  BEFORE UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation_of_posted_journal();

DROP TRIGGER IF EXISTS transaction_lines_immutable_posted_trg ON public.transaction_lines;
CREATE TRIGGER transaction_lines_immutable_posted_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.transaction_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation_of_posted_journal();

-- ---------------------------------------------------------------------------
-- Closed period: block posting into closed months
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_period_open(
  p_mosque_id UUID,
  p_entry_date DATE
) RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  st TEXT;
BEGIN
  SELECT fp.status INTO st
  FROM public.fiscal_periods fp
  WHERE fp.mosque_id = p_mosque_id
    AND p_entry_date BETWEEN fp.starts_on AND fp.ends_on;

  IF st = 'closed' THEN
    RAISE EXCEPTION 'period_closed'
      USING ERRCODE = 'P0001',
            MESSAGE = 'এই মাসের হিসাব বন্ধ; নতুন এন্ট্রি পোস্ট করা যায় না';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Balance check + refresh denormalized totals
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_transaction_totals(p_tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  d BIGINT;
  c BIGINT;
BEGIN
  SELECT COALESCE(SUM(debit_poisha), 0), COALESCE(SUM(credit_poisha), 0)
  INTO d, c
  FROM public.transaction_lines
  WHERE transaction_id = p_tx_id;

  UPDATE public.transactions
  SET total_debit_poisha = d,
      total_credit_poisha = c,
      updated_at = now()
  WHERE id = p_tx_id
    AND status NOT IN ('posted', 'reversed', 'voided');
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_journal_balanced(p_tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  d BIGINT;
  c BIGINT;
  line_count INT;
BEGIN
  SELECT COALESCE(SUM(debit_poisha), 0),
         COALESCE(SUM(credit_poisha), 0),
         COUNT(*)
  INTO d, c, line_count
  FROM public.transaction_lines
  WHERE transaction_id = p_tx_id;

  IF line_count < 2 THEN
    RAISE EXCEPTION 'journal_incomplete'
      USING ERRCODE = 'P0001',
            MESSAGE = 'জার্নালে কমপক্ষে দুইটি লাইন থাকতে হবে';
  END IF;

  IF d <> c THEN
    RAISE EXCEPTION 'journal_unbalanced'
      USING ERRCODE = 'P0001',
            MESSAGE = format('জার্নাল ভারসাম্যহীন: ডেবিট %s, ক্রেডিট %s', d, c);
  END IF;

  IF d = 0 THEN
    RAISE EXCEPTION 'journal_zero'
      USING ERRCODE = 'P0001',
            MESSAGE = 'শূন্য পরিমাণের জার্নাল পোস্ট করা যায় না';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fund available balance (posted only), optional as-of date
-- Income credits increase restricted fund; expenses debit decrease.
-- Simplified: sum of lines on income/expense/equity vs asset for the fund.
-- Authoritative definition: net of all posted lines tagged with fund_id
-- where account type is income (+credit-debit), expense (+debit-credit),
-- and asset/liability movements attributed to the fund.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fund_balance_poisha(
  p_mosque_id UUID,
  p_fund_id UUID,
  p_as_of DATE DEFAULT CURRENT_DATE
) RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE a.type
      WHEN 'income'  THEN tl.credit_poisha - tl.debit_poisha
      WHEN 'expense' THEN tl.debit_poisha - tl.credit_poisha
      WHEN 'equity'  THEN tl.credit_poisha - tl.debit_poisha
      WHEN 'liability' THEN tl.credit_poisha - tl.debit_poisha
      WHEN 'asset'   THEN tl.debit_poisha - tl.credit_poisha
      ELSE 0
    END
  ), 0)::BIGINT
  FROM public.transaction_lines tl
  JOIN public.transactions t ON t.id = tl.transaction_id
  JOIN public.accounts a ON a.id = tl.account_id
  WHERE tl.mosque_id = p_mosque_id
    AND tl.fund_id = p_fund_id
    AND t.status = 'posted'
    AND t.entry_date <= p_as_of;
$$;

-- Net assets style balance for a fund (cash view): asset debits net for fund
CREATE OR REPLACE FUNCTION public.fund_cash_balance_poisha(
  p_mosque_id UUID,
  p_fund_id UUID,
  p_as_of DATE DEFAULT CURRENT_DATE
) RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(tl.debit_poisha - tl.credit_poisha), 0)::BIGINT
  FROM public.transaction_lines tl
  JOIN public.transactions t ON t.id = tl.transaction_id
  JOIN public.accounts a ON a.id = tl.account_id
  WHERE tl.mosque_id = p_mosque_id
    AND tl.fund_id = p_fund_id
    AND t.status = 'posted'
    AND t.entry_date <= p_as_of
    AND a.type = 'asset';
$$;

-- ---------------------------------------------------------------------------
-- Approval threshold evaluation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.requires_approval_for(
  p_mosque_id UUID,
  p_request_type public.approval_request_type,
  p_amount_poisha BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  th BIGINT;
BEGIN
  SELECT threshold_poisha INTO th
  FROM public.approval_thresholds
  WHERE mosque_id = p_mosque_id AND request_type = p_request_type;

  IF NOT FOUND THEN
    -- Default: expenses/transfers/corrections over 0 require approval if no config
    -- Safer default for expenses and transfers: require above 0
    RETURN p_request_type IN ('expense', 'transfer', 'correction', 'bill', 'journal')
           AND p_amount_poisha > 0;
  END IF;

  RETURN p_amount_poisha >= th;
END;
$$;

CREATE OR REPLACE FUNCTION public.separate_duties_required(
  p_mosque_id UUID,
  p_request_type public.approval_request_type
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT separate_duties FROM public.approval_thresholds
     WHERE mosque_id = p_mosque_id AND request_type = p_request_type),
    true
  );
$$;

-- ---------------------------------------------------------------------------
-- Atomic post
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_journal(
  p_tx_id UUID,
  p_actor UUID
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  tx public.transactions;
  req_type public.approval_request_type;
BEGIN
  -- Lock row to serialize concurrent post attempts
  SELECT * INTO tx
  FROM public.transactions
  WHERE id = p_tx_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF tx.status = 'posted' THEN
    RETURN tx; -- idempotent post
  END IF;

  IF tx.status NOT IN ('draft', 'submitted', 'approved', 'pending_approval') THEN
    RAISE EXCEPTION 'journal_not_postable'
      USING ERRCODE = 'P0001',
            MESSAGE = format('status %s cannot be posted', tx.status);
  END IF;

  PERFORM public.assert_period_open(tx.mosque_id, tx.entry_date);
  PERFORM public.assert_journal_balanced(p_tx_id);

  -- Map source to approval type
  req_type := CASE tx.source_type
    WHEN 'transfer' THEN 'transfer'::public.approval_request_type
    WHEN 'correction' THEN 'correction'::public.approval_request_type
    WHEN 'bill' THEN 'bill'::public.approval_request_type
    ELSE 'journal'::public.approval_request_type
  END;

  IF public.requires_approval_for(tx.mosque_id, req_type, tx.total_debit_poisha)
     AND tx.status IS DISTINCT FROM 'approved' THEN
    -- Allow if status already approved; otherwise block
    IF tx.status NOT IN ('approved') THEN
      RAISE EXCEPTION 'approval_required'
        USING ERRCODE = 'P0001',
              MESSAGE = 'অনুমোদন ছাড়া পোস্ট করা যাবে না';
    END IF;
  END IF;

  -- Separation of duties
  IF public.separate_duties_required(tx.mosque_id, req_type)
     AND tx.submitted_by IS NOT NULL
     AND tx.submitted_by = p_actor
     AND tx.requires_approval THEN
    RAISE EXCEPTION 'separation_of_duties'
      USING ERRCODE = 'P0001',
            MESSAGE = 'যিনি জমা দিয়েছেন তিনিই অনুমোদন/পোস্ট করতে পারবেন না';
  END IF;

  UPDATE public.transactions
  SET status = 'posted',
      posted_at = now(),
      posted_by = p_actor,
      locked_at = now(),
      updated_at = now()
  WHERE id = p_tx_id
  RETURNING * INTO tx;

  INSERT INTO public.audit_logs (
    mosque_id, actor_user_id, action, entity_type, entity_id, new_values
  ) VALUES (
    tx.mosque_id, p_actor, 'journal.posted', 'transactions', tx.id, to_jsonb(tx)
  );

  RETURN tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- Submit for approval
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_journal(
  p_tx_id UUID,
  p_actor UUID
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  tx public.transactions;
  req_type public.approval_request_type;
  need_appr BOOLEAN;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF tx.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'journal_not_submittable' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.refresh_transaction_totals(p_tx_id);
  PERFORM public.assert_journal_balanced(p_tx_id);

  SELECT * INTO tx FROM public.transactions WHERE id = p_tx_id;

  req_type := CASE tx.source_type
    WHEN 'transfer' THEN 'transfer'::public.approval_request_type
    WHEN 'correction' THEN 'correction'::public.approval_request_type
    WHEN 'bill' THEN 'bill'::public.approval_request_type
    ELSE 'journal'::public.approval_request_type
  END;

  need_appr := public.requires_approval_for(
    tx.mosque_id, req_type, tx.total_debit_poisha
  );

  IF need_appr THEN
    UPDATE public.transactions
    SET status = 'pending_approval',
        requires_approval = true,
        submitted_at = now(),
        submitted_by = p_actor,
        updated_at = now()
    WHERE id = p_tx_id
    RETURNING * INTO tx;

    INSERT INTO public.approvals (
      mosque_id, request_type, reference_id, amount_poisha, requested_by, status
    ) VALUES (
      tx.mosque_id, req_type, tx.id, tx.total_debit_poisha, p_actor, 'pending'
    );
  ELSE
    UPDATE public.transactions
    SET status = 'approved',
        requires_approval = false,
        submitted_at = now(),
        submitted_by = p_actor,
        approved_at = now(),
        approved_by = p_actor,
        updated_at = now()
    WHERE id = p_tx_id
    RETURNING * INTO tx;
  END IF;

  RETURN tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- Approve / reject
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_journal(
  p_tx_id UUID,
  p_actor UUID
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  tx public.transactions;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF tx.status NOT IN ('pending_approval', 'submitted') THEN
    RAISE EXCEPTION 'journal_not_approvable' USING ERRCODE = 'P0001';
  END IF;

  IF public.separate_duties_required(tx.mosque_id, 'journal')
     AND tx.submitted_by = p_actor THEN
    RAISE EXCEPTION 'separation_of_duties'
      USING ERRCODE = 'P0001',
            MESSAGE = 'জমাদাতা অনুমোদন করতে পারবেন না';
  END IF;

  UPDATE public.transactions
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_actor,
      updated_at = now()
  WHERE id = p_tx_id
  RETURNING * INTO tx;

  UPDATE public.approvals
  SET status = 'approved',
      decided_by = p_actor,
      decided_at = now()
  WHERE reference_id = p_tx_id AND status = 'pending';

  RETURN tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_journal(
  p_tx_id UUID,
  p_actor UUID,
  p_reason TEXT
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  tx public.transactions;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF tx.status NOT IN ('pending_approval', 'submitted') THEN
    RAISE EXCEPTION 'journal_not_rejectable' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.transactions
  SET status = 'rejected',
      rejected_at = now(),
      rejected_by = p_actor,
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_tx_id
  RETURNING * INTO tx;

  UPDATE public.approvals
  SET status = 'rejected',
      decided_by = p_actor,
      decided_at = now(),
      decision_comment = p_reason
  WHERE reference_id = p_tx_id AND status = 'pending';

  RETURN tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- Controlled reversal: creates opposite posted entry, links both
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_journal(
  p_tx_id UUID,
  p_actor UUID,
  p_reason TEXT,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  orig public.transactions;
  rev public.transactions;
  rev_number TEXT;
  line RECORD;
BEGIN
  SELECT * INTO orig FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF NOT FOUND OR orig.status <> 'posted' THEN
    RAISE EXCEPTION 'journal_not_reversible' USING ERRCODE = 'P0001';
  END IF;
  IF orig.reversed_by_id IS NOT NULL THEN
    -- already reversed — return existing reversal (idempotent)
    SELECT * INTO rev FROM public.transactions WHERE id = orig.reversed_by_id;
    RETURN rev;
  END IF;

  PERFORM public.assert_period_open(orig.mosque_id, CURRENT_DATE);

  rev_number := orig.entry_number || '-R';

  INSERT INTO public.transactions (
    mosque_id, entry_number, entry_date, description, status, source_type,
    reverses_id, created_by, idempotency_key,
    total_debit_poisha, total_credit_poisha,
    posted_at, posted_by, locked_at
  ) VALUES (
    orig.mosque_id, rev_number, CURRENT_DATE,
    COALESCE(p_reason, 'Reversal of ' || orig.entry_number),
    'posted', 'correction',
    orig.id, p_actor, p_idempotency_key,
    orig.total_credit_poisha, orig.total_debit_poisha,
    now(), p_actor, now()
  )
  RETURNING * INTO rev;

  -- Temporarily allow line insert on posted parent by inserting while status is posted
  -- Disable immutability for this session via lines inserted with special path:
  -- We insert lines by disabling trigger is not possible; use SECURITY DEFINER
  -- and insert before marking — actually reverse creates already-posted header.
  -- Workaround: insert lines first on a draft then post — cleaner:

  -- Rebuild: mark rev as draft briefly is messy. Instead drop line trigger for
  -- function owner — triggers still fire. Pattern: insert rev as draft, lines, post.

  DELETE FROM public.transactions WHERE id = rev.id;

  INSERT INTO public.transactions (
    mosque_id, entry_number, entry_date, description, status, source_type,
    reverses_id, created_by, idempotency_key
  ) VALUES (
    orig.mosque_id, rev_number, CURRENT_DATE,
    COALESCE(p_reason, 'Reversal of ' || orig.entry_number),
    'draft', 'correction',
    orig.id, p_actor, p_idempotency_key
  )
  RETURNING * INTO rev;

  FOR line IN
    SELECT * FROM public.transaction_lines WHERE transaction_id = orig.id
  LOOP
    INSERT INTO public.transaction_lines (
      mosque_id, transaction_id, account_id, fund_id,
      debit_poisha, credit_poisha, memo, line_order
    ) VALUES (
      line.mosque_id, rev.id, line.account_id, line.fund_id,
      line.credit_poisha, line.debit_poisha,
      'Reversal: ' || COALESCE(line.memo, ''), line.line_order
    );
  END LOOP;

  PERFORM public.refresh_transaction_totals(rev.id);

  UPDATE public.transactions
  SET status = 'posted',
      posted_at = now(),
      posted_by = p_actor,
      locked_at = now(),
      total_debit_poisha = orig.total_credit_poisha,
      total_credit_poisha = orig.total_debit_poisha
  WHERE id = rev.id
  RETURNING * INTO rev;

  UPDATE public.transactions
  SET reversed_by_id = rev.id,
      status = 'reversed',
      updated_at = now()
  WHERE id = orig.id;

  INSERT INTO public.audit_logs (
    mosque_id, actor_user_id, action, entity_type, entity_id, new_values
  ) VALUES (
    orig.mosque_id, p_actor, 'journal.reversed', 'transactions', orig.id,
    jsonb_build_object('reversal_id', rev.id, 'reason', p_reason)
  );

  RETURN rev;
END;
$$;

-- ---------------------------------------------------------------------------
-- Create balanced transfer between funds (same mosque)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_fund_transfer(
  p_mosque_id UUID,
  p_from_fund UUID,
  p_to_fund UUID,
  p_amount_poisha BIGINT,
  p_cash_account UUID,
  p_entry_date DATE,
  p_description TEXT,
  p_actor UUID,
  p_idempotency_key TEXT DEFAULT NULL,
  p_entry_number TEXT DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql
AS $$
DECLARE
  tx public.transactions;
  enumber TEXT;
  from_mosque UUID;
  to_mosque UUID;
BEGIN
  IF p_amount_poisha <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF p_from_fund = p_to_fund THEN
    RAISE EXCEPTION 'same_fund_transfer' USING ERRCODE = 'P0001';
  END IF;

  SELECT mosque_id INTO from_mosque FROM public.funds WHERE id = p_from_fund;
  SELECT mosque_id INTO to_mosque FROM public.funds WHERE id = p_to_fund;
  IF from_mosque IS DISTINCT FROM p_mosque_id OR to_mosque IS DISTINCT FROM p_mosque_id THEN
    RAISE EXCEPTION 'fund_mosque_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent return
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO tx FROM public.transactions
    WHERE mosque_id = p_mosque_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN tx;
    END IF;
  END IF;

  enumber := COALESCE(p_entry_number, 'TR-' || to_char(now(), 'YYYYMMDD-HH24MISS'));

  INSERT INTO public.transactions (
    mosque_id, entry_number, entry_date, description, status, source_type,
    created_by, idempotency_key
  ) VALUES (
    p_mosque_id, enumber, p_entry_date, p_description, 'draft', 'transfer',
    p_actor, p_idempotency_key
  )
  RETURNING * INTO tx;

  -- Credit asset under from_fund, debit asset under to_fund (move cash between funds)
  INSERT INTO public.transaction_lines (
    mosque_id, transaction_id, account_id, fund_id, debit_poisha, credit_poisha, line_order
  ) VALUES
    (p_mosque_id, tx.id, p_cash_account, p_to_fund, p_amount_poisha, 0, 1),
    (p_mosque_id, tx.id, p_cash_account, p_from_fund, 0, p_amount_poisha, 2);

  PERFORM public.refresh_transaction_totals(tx.id);
  SELECT * INTO tx FROM public.transactions WHERE id = tx.id;
  RETURN tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- Period close: mark month closed (blocks new posts into range)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_fiscal_period(
  p_period_id UUID,
  p_actor UUID
) RETURNS public.fiscal_periods
LANGUAGE plpgsql
AS $$
DECLARE
  fp public.fiscal_periods;
  pending INT;
BEGIN
  SELECT * INTO fp FROM public.fiscal_periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF fp.status = 'closed' THEN
    RETURN fp;
  END IF;

  SELECT count(*) INTO pending
  FROM public.transactions t
  WHERE t.mosque_id = fp.mosque_id
    AND t.entry_date BETWEEN fp.starts_on AND fp.ends_on
    AND t.status IN ('draft', 'submitted', 'pending_approval', 'approved');

  IF pending > 0 THEN
    RAISE EXCEPTION 'period_has_unposted'
      USING ERRCODE = 'P0001',
            MESSAGE = format('%s unposted journals remain in period', pending);
  END IF;

  UPDATE public.fiscal_periods
  SET status = 'closed',
      closed_at = now(),
      closed_by = p_actor,
      updated_at = now()
  WHERE id = p_period_id
  RETURNING * INTO fp;

  INSERT INTO public.audit_logs (
    mosque_id, actor_user_id, action, entity_type, entity_id, new_values
  ) VALUES (
    fp.mosque_id, p_actor, 'period.closed', 'fiscal_periods', fp.id, to_jsonb(fp)
  );

  RETURN fp;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_fiscal_period(
  p_mosque_id UUID,
  p_year INT,
  p_month INT
) RETURNS public.fiscal_periods
LANGUAGE plpgsql
AS $$
DECLARE
  fp public.fiscal_periods;
  d_start DATE;
  d_end DATE;
BEGIN
  d_start := make_date(p_year, p_month, 1);
  d_end := (d_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  INSERT INTO public.fiscal_periods (
    mosque_id, year, month, starts_on, ends_on, status
  ) VALUES (
    p_mosque_id, p_year, p_month, d_start, d_end, 'open'
  )
  ON CONFLICT (mosque_id, year, month) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO fp;

  RETURN fp;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_thresholds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY fiscal_periods_select ON public.fiscal_periods FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());
CREATE POLICY fiscal_periods_write ON public.fiscal_periods FOR ALL TO authenticated
  USING (public.is_mosque_admin(mosque_id))
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY approval_thresholds_select ON public.approval_thresholds FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());
CREATE POLICY approval_thresholds_write ON public.approval_thresholds FOR ALL TO authenticated
  USING (public.is_mosque_admin(mosque_id))
  WITH CHECK (public.is_mosque_admin(mosque_id));

CREATE POLICY bills_select ON public.bills FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());
CREATE POLICY bills_write ON public.bills FOR ALL TO authenticated
  USING (public.can_manage_accounting(mosque_id))
  WITH CHECK (public.can_manage_accounting(mosque_id));

CREATE POLICY bill_payments_select ON public.bill_payments FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());
CREATE POLICY bill_payments_write ON public.bill_payments FOR ALL TO authenticated
  USING (public.can_manage_accounting(mosque_id))
  WITH CHECK (public.can_manage_accounting(mosque_id));

CREATE POLICY receipts_select ON public.receipts FOR SELECT TO authenticated
  USING (public.can_view_financials(mosque_id) OR public.is_platform_admin());
CREATE POLICY receipts_write ON public.receipts FOR ALL TO authenticated
  USING (public.can_manage_accounting(mosque_id))
  WITH CHECK (public.can_manage_accounting(mosque_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.fiscal_periods TO service_role;
GRANT ALL ON public.approval_thresholds TO service_role;
GRANT ALL ON public.bills TO service_role;
GRANT ALL ON public.bill_payments TO service_role;
GRANT ALL ON public.receipts TO service_role;

GRANT EXECUTE ON FUNCTION public.post_journal(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_journal(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_journal(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_journal(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_journal(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_fund_transfer(UUID, UUID, UUID, BIGINT, UUID, DATE, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_fiscal_period(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_fiscal_period(UUID, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fund_balance_poisha(UUID, UUID, DATE) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fund_cash_balance_poisha(UUID, UUID, DATE) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.assert_journal_balanced(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_transaction_totals(UUID) TO authenticated, service_role;
