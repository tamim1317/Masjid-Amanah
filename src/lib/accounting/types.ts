/** Money is always integer poisha (1 BDT = 100 poisha). Never use float. */

export type TransactionStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted"
  | "reversed"
  | "voided";

export type TransactionSource =
  | "manual"
  | "receipt"
  | "transfer"
  | "correction"
  | "salary"
  | "opening_balance"
  | "bill"
  | "adjustment"
  | "period_close"
  | "other";

export interface JournalLineInput {
  accountId: string;
  fundId: string;
  debitPoisha: number;
  creditPoisha: number;
  memo?: string;
}

export interface CreateJournalInput {
  mosqueId: string;
  entryNumber: string;
  entryDate: string; // ISO date
  description: string;
  sourceType?: TransactionSource;
  lines: JournalLineInput[];
  idempotencyKey?: string;
}

export function assertNonNegativeInteger(n: number, field: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${field} must be a non-negative integer (poisha)`);
  }
}

export function assertLinesBalanced(lines: JournalLineInput[]): void {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    assertNonNegativeInteger(line.debitPoisha, "debitPoisha");
    assertNonNegativeInteger(line.creditPoisha, "creditPoisha");
    if (line.debitPoisha > 0 && line.creditPoisha > 0) {
      throw new Error("line cannot have both debit and credit");
    }
    debit += line.debitPoisha;
    credit += line.creditPoisha;
  }
  if (lines.length < 2) {
    throw new Error("journal requires at least two lines");
  }
  if (debit !== credit) {
    throw new Error(`journal unbalanced: debit ${debit} credit ${credit}`);
  }
  if (debit === 0) {
    throw new Error("journal amount cannot be zero");
  }
}

/** Format poisha as BDT string without floating point */
export function formatPoisha(poisha: number, locale: "bn" | "en" = "bn"): string {
  const sign = poisha < 0 ? "-" : "";
  const abs = Math.abs(poisha);
  const taka = Math.floor(abs / 100);
  const p = abs % 100;
  const num = `${taka}.${p.toString().padStart(2, "0")}`;
  return locale === "bn" ? `${sign}৳${num}` : `${sign}BDT ${num}`;
}
