import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  requireAccountingAccess,
  requireApproverAccess,
  requireMosqueAdmin,
} from "@/lib/auth/authorize";
import {
  assertLinesBalanced,
  type CreateJournalInput,
  type JournalLineInput,
} from "@/lib/accounting/types";
import { AppAuthError } from "@/lib/auth/errors";

/**
 * Accounting service — all money paths go through Postgres functions
 * for atomicity. Application layer validates shape then calls RPC.
 */

export async function createDraftJournal(input: CreateJournalInput) {
  assertLinesBalanced(input.lines);
  const ctx = await requireAccountingAccess(input.mosqueId);
  const supabase = await createClient();

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      mosque_id: input.mosqueId,
      entry_number: input.entryNumber,
      entry_date: input.entryDate,
      description: input.description,
      status: "draft",
      source_type: input.sourceType ?? "manual",
      created_by: ctx.user.id,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Idempotent: return existing
      const { data: existing } = await supabase
        .from("transactions")
        .select("*")
        .eq("mosque_id", input.mosqueId)
        .eq("idempotency_key", input.idempotencyKey!)
        .maybeSingle();
      if (existing) return existing;
    }
    throw error;
  }

  const lines = input.lines.map((l: JournalLineInput, i: number) => ({
    mosque_id: input.mosqueId,
    transaction_id: tx.id,
    account_id: l.accountId,
    fund_id: l.fundId,
    debit_poisha: l.debitPoisha,
    credit_poisha: l.creditPoisha,
    memo: l.memo ?? null,
    line_order: i + 1,
  }));

  const { error: lineErr } = await supabase
    .from("transaction_lines")
    .insert(lines);
  if (lineErr) {
    // Best-effort cleanup of orphan draft (may fail under RLS — use RPC later)
    await supabase.from("transactions").delete().eq("id", tx.id);
    throw lineErr;
  }

  await supabase.rpc("refresh_transaction_totals", { p_tx_id: tx.id });

  const { data: refreshed } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", tx.id)
    .single();

  return refreshed ?? tx;
}

export async function submitJournal(transactionId: string, mosqueId: string) {
  const ctx = await requireAccountingAccess(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_journal", {
    p_tx_id: transactionId,
    p_actor: ctx.user.id,
  });
  if (error) throw error;
  return data;
}

export async function approveJournal(transactionId: string, mosqueId: string) {
  const ctx = await requireApproverAccess(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_journal", {
    p_tx_id: transactionId,
    p_actor: ctx.user.id,
  });
  if (error) throw error;
  return data;
}

export async function rejectJournal(
  transactionId: string,
  mosqueId: string,
  reason: string
) {
  const ctx = await requireApproverAccess(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reject_journal", {
    p_tx_id: transactionId,
    p_actor: ctx.user.id,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function postJournal(transactionId: string, mosqueId: string) {
  const ctx = await requireAccountingAccess(mosqueId);
  // If requires approval, poster should be approver path — enforced in SQL
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_journal", {
    p_tx_id: transactionId,
    p_actor: ctx.user.id,
  });
  if (error) throw error;
  return data;
}

export async function reverseJournal(
  transactionId: string,
  mosqueId: string,
  reason: string,
  idempotencyKey?: string
) {
  const ctx = await requireAccountingAccess(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reverse_journal", {
    p_tx_id: transactionId,
    p_actor: ctx.user.id,
    p_reason: reason,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw error;
  return data;
}

export async function createTransfer(input: {
  mosqueId: string;
  fromFundId: string;
  toFundId: string;
  amountPoisha: number;
  cashAccountId: string;
  entryDate: string;
  description: string;
  idempotencyKey?: string;
  entryNumber?: string;
}) {
  if (!Number.isInteger(input.amountPoisha) || input.amountPoisha <= 0) {
    throw new AppAuthError("validation", 400);
  }
  const ctx = await requireAccountingAccess(input.mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_fund_transfer", {
    p_mosque_id: input.mosqueId,
    p_from_fund: input.fromFundId,
    p_to_fund: input.toFundId,
    p_amount_poisha: input.amountPoisha,
    p_cash_account: input.cashAccountId,
    p_entry_date: input.entryDate,
    p_description: input.description,
    p_actor: ctx.user.id,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_entry_number: input.entryNumber ?? null,
  });
  if (error) throw error;
  return data;
}

export async function closePeriod(periodId: string, mosqueId: string) {
  await requireMosqueAdmin(mosqueId);
  const ctx = await requireMosqueAdmin(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_fiscal_period", {
    p_period_id: periodId,
    p_actor: ctx.user.id,
  });
  if (error) throw error;
  return data;
}

/** Authoritative fund cash balance from posted lines only */
export async function getFundCashBalance(
  mosqueId: string,
  fundId: string,
  asOf?: string
) {
  await requireAccountingAccess(mosqueId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fund_cash_balance_poisha", {
    p_mosque_id: mosqueId,
    p_fund_id: fundId,
    p_as_of: asOf ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return data as number;
}
