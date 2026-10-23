-- Masjid Amanah — Extensions & Enums
-- Migration: 20261023000001

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mosque lifecycle
CREATE TYPE public.mosque_status AS ENUM ('pending', 'active', 'suspended');

-- Membership lifecycle
CREATE TYPE public.membership_status AS ENUM ('invited', 'active', 'revoked');

-- Roles within a mosque (tenant-scoped)
CREATE TYPE public.mosque_role AS ENUM (
  'admin',
  'treasurer',
  'approver',
  'committee',
  'staff',
  'viewer'
);

-- Fund restriction
CREATE TYPE public.fund_restriction AS ENUM (
  'unrestricted',
  'restricted',
  'temporarily_restricted'
);

-- Chart of accounts types
CREATE TYPE public.account_type AS ENUM (
  'asset',
  'liability',
  'equity',
  'income',
  'expense'
);

-- Transaction (journal entry) status
CREATE TYPE public.transaction_status AS ENUM (
  'draft',
  'pending_approval',
  'posted',
  'voided'
);

-- Transaction source
CREATE TYPE public.transaction_source AS ENUM (
  'manual',
  'receipt',
  'transfer',
  'correction',
  'salary',
  'other'
);

-- Approval request types & status
CREATE TYPE public.approval_request_type AS ENUM (
  'expense',
  'transfer',
  'correction',
  'other'
);

CREATE TYPE public.approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

-- Public visibility for publishable records
CREATE TYPE public.publish_status AS ENUM (
  'draft',
  'published',
  'unpublished'
);

COMMENT ON TYPE public.mosque_role IS 'Tenant-scoped roles; platform operators use profiles.is_platform_admin';
