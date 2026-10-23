-- Masjid Amanah — Core tables
-- Migration: 20261023000002
-- Amounts: BIGINT in poisha (1 BDT = 100 poisha). Never use floating point for money.

-- ---------------------------------------------------------------------------
-- mosques (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE public.mosques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL,
  name_bn         TEXT NOT NULL,
  name_en         TEXT,
  status          public.mosque_status NOT NULL DEFAULT 'pending',
  timezone        TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  fiscal_year_start_month SMALLINT NOT NULL DEFAULT 7
    CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Public surface controls
  public_profile_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mosques_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT mosques_slug_unique UNIQUE (slug)
);

CREATE INDEX mosques_status_idx ON public.mosques (status);

COMMENT ON TABLE public.mosques IS 'Tenant root. Every tenant-owned row references mosques.id';

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users when Supabase Auth is used)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY, -- equals auth.users.id in production
  phone             TEXT,
  email             TEXT,
  full_name         TEXT NOT NULL DEFAULT '',
  locale            TEXT NOT NULL DEFAULT 'bn' CHECK (locale IN ('bn', 'en')),
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_phone_unique UNIQUE (phone),
  CONSTRAINT profiles_email_unique UNIQUE (email),
  CONSTRAINT profiles_contact_present CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

COMMENT ON TABLE public.profiles IS 'App user profile. id matches auth.users(id) under Supabase Auth.';

-- ---------------------------------------------------------------------------
-- mosque_memberships
-- ---------------------------------------------------------------------------
CREATE TABLE public.mosque_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  roles           public.mosque_role[] NOT NULL DEFAULT '{}',
  status          public.membership_status NOT NULL DEFAULT 'invited',
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mosque_memberships_unique_member UNIQUE (mosque_id, user_id),
  CONSTRAINT mosque_memberships_roles_nonempty CHECK (
    status <> 'active' OR cardinality(roles) >= 1
  )
);

CREATE INDEX mosque_memberships_user_idx ON public.mosque_memberships (user_id);
CREATE INDEX mosque_memberships_mosque_status_idx
  ON public.mosque_memberships (mosque_id, status);

COMMENT ON TABLE public.mosque_memberships IS 'User ↔ mosque with role array. Active membership required for tenant access.';

-- ---------------------------------------------------------------------------
-- funds
-- ---------------------------------------------------------------------------
CREATE TABLE public.funds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name_bn           TEXT NOT NULL,
  name_en           TEXT,
  restriction_type  public.fund_restriction NOT NULL DEFAULT 'unrestricted',
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  -- Public transparency: only published funds may appear on public pages
  publish_status    public.publish_status NOT NULL DEFAULT 'draft',
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT funds_mosque_code_unique UNIQUE (mosque_id, code),
  CONSTRAINT funds_code_format CHECK (code ~ '^[A-Z][A-Z0-9_]{0,31}$')
);

CREATE INDEX funds_mosque_idx ON public.funds (mosque_id);
CREATE INDEX funds_mosque_publish_idx ON public.funds (mosque_id, publish_status)
  WHERE publish_status = 'published';

-- ---------------------------------------------------------------------------
-- accounts (chart of accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name_bn         TEXT NOT NULL,
  name_en         TEXT,
  type            public.account_type NOT NULL,
  subtype         TEXT,
  fund_id         UUID REFERENCES public.funds (id) ON DELETE SET NULL,
  parent_id       UUID REFERENCES public.accounts (id) ON DELETE SET NULL,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT accounts_mosque_code_unique UNIQUE (mosque_id, code)
);

CREATE INDEX accounts_mosque_idx ON public.accounts (mosque_id);
CREATE INDEX accounts_fund_idx ON public.accounts (fund_id);

-- Ensure fund and account belong to the same mosque (defense in depth)
CREATE OR REPLACE FUNCTION public.check_account_fund_same_mosque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.funds f
      WHERE f.id = NEW.fund_id AND f.mosque_id = NEW.mosque_id
    ) THEN
      RAISE EXCEPTION 'account fund must belong to the same mosque';
    END IF;
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = NEW.parent_id AND a.mosque_id = NEW.mosque_id
    ) THEN
      RAISE EXCEPTION 'account parent must belong to the same mosque';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_same_mosque_trg
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.check_account_fund_same_mosque();

-- ---------------------------------------------------------------------------
-- transactions (journal entries)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  entry_number    TEXT NOT NULL,
  entry_date      DATE NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          public.transaction_status NOT NULL DEFAULT 'draft',
  source_type     public.transaction_source NOT NULL DEFAULT 'manual',
  source_id       UUID,
  posted_at       TIMESTAMPTZ,
  posted_by       UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  reverses_id     UUID REFERENCES public.transactions (id) ON DELETE SET NULL,
  reversed_by_id  UUID REFERENCES public.transactions (id) ON DELETE SET NULL,
  -- Public transparency (rare; usually only summaries are public)
  publish_status  public.publish_status NOT NULL DEFAULT 'draft',
  created_by      UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transactions_mosque_entry_number_unique UNIQUE (mosque_id, entry_number)
);

CREATE INDEX transactions_mosque_date_idx ON public.transactions (mosque_id, entry_date DESC);
CREATE INDEX transactions_mosque_status_idx ON public.transactions (mosque_id, status);

COMMENT ON TABLE public.transactions IS 'Journal header. Posted rows must not be hard-deleted; use void/reverse.';

-- ---------------------------------------------------------------------------
-- transaction_lines
-- ---------------------------------------------------------------------------
CREATE TABLE public.transaction_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id         UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  transaction_id    UUID NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES public.accounts (id),
  fund_id           UUID NOT NULL REFERENCES public.funds (id),
  -- Amounts in poisha; exactly one of debit/credit should be > 0 for normal lines
  debit_poisha      BIGINT NOT NULL DEFAULT 0 CHECK (debit_poisha >= 0),
  credit_poisha     BIGINT NOT NULL DEFAULT 0 CHECK (credit_poisha >= 0),
  memo              TEXT,
  line_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transaction_lines_debit_xor_credit CHECK (
    (debit_poisha > 0 AND credit_poisha = 0)
    OR (credit_poisha > 0 AND debit_poisha = 0)
    OR (debit_poisha = 0 AND credit_poisha = 0)
  )
);

CREATE INDEX transaction_lines_tx_idx ON public.transaction_lines (transaction_id);
CREATE INDEX transaction_lines_mosque_fund_idx ON public.transaction_lines (mosque_id, fund_id);
CREATE INDEX transaction_lines_account_idx ON public.transaction_lines (account_id);

-- Same-mosque integrity for lines
CREATE OR REPLACE FUNCTION public.check_transaction_line_same_mosque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tx_mosque UUID;
  acct_mosque UUID;
  fund_mosque UUID;
BEGIN
  SELECT mosque_id INTO tx_mosque FROM public.transactions WHERE id = NEW.transaction_id;
  SELECT mosque_id INTO acct_mosque FROM public.accounts WHERE id = NEW.account_id;
  SELECT mosque_id INTO fund_mosque FROM public.funds WHERE id = NEW.fund_id;

  IF tx_mosque IS NULL OR tx_mosque <> NEW.mosque_id THEN
    RAISE EXCEPTION 'transaction_line mosque_id must match parent transaction';
  END IF;
  IF acct_mosque IS NULL OR acct_mosque <> NEW.mosque_id THEN
    RAISE EXCEPTION 'transaction_line account must belong to the same mosque';
  END IF;
  IF fund_mosque IS NULL OR fund_mosque <> NEW.mosque_id THEN
    RAISE EXCEPTION 'transaction_line fund must belong to the same mosque';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transaction_lines_same_mosque_trg
  BEFORE INSERT OR UPDATE ON public.transaction_lines
  FOR EACH ROW EXECUTE FUNCTION public.check_transaction_line_same_mosque();

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------
CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  request_type    public.approval_request_type NOT NULL,
  reference_id    UUID NOT NULL, -- typically transactions.id
  amount_poisha   BIGINT NOT NULL CHECK (amount_poisha >= 0),
  requested_by    UUID NOT NULL REFERENCES public.profiles (id),
  status          public.approval_status NOT NULL DEFAULT 'pending',
  decided_by      UUID REFERENCES public.profiles (id),
  decided_at      TIMESTAMPTZ,
  decision_comment TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX approvals_mosque_status_idx ON public.approvals (mosque_id, status);
CREATE INDEX approvals_reference_idx ON public.approvals (reference_id);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
CREATE TABLE public.attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID NOT NULL REFERENCES public.mosques (id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  storage_path    TEXT NOT NULL, -- must include mosque_id prefix in application layer
  file_name       TEXT NOT NULL,
  content_type    TEXT,
  size_bytes      BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  uploaded_by     UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attachments_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX attachments_entity_idx ON public.attachments (mosque_id, entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- audit_logs (append-only intent; no UPDATE/DELETE grants for app roles)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id       UUID REFERENCES public.mosques (id) ON DELETE SET NULL,
  actor_user_id   UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_mosque_created_idx ON public.audit_logs (mosque_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

COMMENT ON TABLE public.audit_logs IS 'Append-oriented audit trail. RLS allows INSERT for members; SELECT scoped by role.';
