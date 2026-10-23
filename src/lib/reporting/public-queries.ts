import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  FundPublicTotal,
  PeriodTotals,
  PublicMosqueProfile,
  PublicTransactionRow,
  PublishedReportMeta,
} from "@/lib/reporting/types";

/**
 * Read-only public reporting queries.
 * Prefer SECURITY DEFINER RPCs so anon never sees drafts/pending.
 */

export async function getPublicMosqueBySlug(
  slug: string
): Promise<PublicMosqueProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mosques")
    .select("id, slug, name_bn, name_en, public_profile_enabled, status")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("public_profile_enabled", true)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    slug: data.slug,
    nameBn: data.name_bn,
    nameEn: data.name_en,
    publicProfileEnabled: data.public_profile_enabled,
  };
}

export async function getPublicPeriodTotals(
  mosqueId: string,
  start: string,
  end: string
): Promise<PeriodTotals> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_period_totals", {
    p_mosque_id: mosqueId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    incomePoisha: Number(row?.income_poisha ?? 0),
    expensePoisha: Number(row?.expense_poisha ?? 0),
    transferPoisha: Number(row?.transfer_poisha ?? 0),
    closingCashPoisha: Number(row?.closing_cash_poisha ?? 0),
  };
}

export async function getPublicFundTotals(
  mosqueId: string,
  start: string,
  end: string
): Promise<FundPublicTotal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_fund_totals", {
    p_mosque_id: mosqueId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      fund_id: string;
      fund_code: string;
      fund_name_bn: string;
      fund_name_en: string | null;
      restriction_type: string;
      income_poisha: number;
      expense_poisha: number;
      closing_cash_poisha: number;
    }) => ({
      fundId: r.fund_id,
      fundCode: r.fund_code,
      fundNameBn: r.fund_name_bn,
      fundNameEn: r.fund_name_en,
      restrictionType: r.restriction_type,
      incomePoisha: Number(r.income_poisha),
      expensePoisha: Number(r.expense_poisha),
      closingCashPoisha: Number(r.closing_cash_poisha),
    })
  );
}

export async function searchPublicTransactions(input: {
  mosqueId: string;
  start: string;
  end: string;
  fundId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PublicTransactionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_transaction_list", {
    p_mosque_id: input.mosqueId,
    p_start: input.start,
    p_end: input.end,
    p_fund_id: input.fundId ?? null,
    p_search: input.search ?? null,
    p_limit: input.limit ?? 50,
    p_offset: input.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      transaction_id: string;
      entry_date: string;
      entry_number: string;
      source_type: string;
      label_bn: string;
      label_en: string | null;
      amount_poisha: number;
      fund_code: string | null;
      fund_name_bn: string | null;
    }) => ({
      transactionId: r.transaction_id,
      entryDate: r.entry_date,
      entryNumber: r.entry_number,
      sourceType: r.source_type,
      labelBn: r.label_bn,
      labelEn: r.label_en,
      amountPoisha: Number(r.amount_poisha),
      fundCode: r.fund_code,
      fundNameBn: r.fund_name_bn,
    })
  );
}

export async function getPublishedReports(
  mosqueId: string
): Promise<PublishedReportMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_reports")
    .select(
      "id, mosque_id, period_type, period_year, period_month, period_start, period_end, title_bn, title_en, status, revision, published_at, snapshot_poisha, ledger_checksum, notes_public_bn, notes_public_en"
    )
    .eq("mosque_id", mosqueId)
    .eq("status", "published")
    .order("period_end", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    mosqueId: r.mosque_id,
    periodType: r.period_type,
    periodYear: r.period_year,
    periodMonth: r.period_month,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    titleBn: r.title_bn,
    titleEn: r.title_en,
    status: r.status,
    revision: r.revision,
    publishedAt: r.published_at,
    snapshotPoisha: r.snapshot_poisha ?? {},
    ledgerChecksum: r.ledger_checksum,
    notesPublicBn: r.notes_public_bn,
    notesPublicEn: r.notes_public_en,
  }));
}

export async function getPublicAttachments(
  mosqueId: string,
  entityType: string,
  entityId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_attachments_for_entity", {
    p_mosque_id: mosqueId,
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return data ?? [];
}

export { sanitizePublicPayload } from "@/lib/reporting/public-queries-safe";
