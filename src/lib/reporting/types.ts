export interface PeriodTotals {
  incomePoisha: number;
  expensePoisha: number;
  transferPoisha: number;
  closingCashPoisha: number;
}

export interface FundPublicTotal {
  fundId: string;
  fundCode: string;
  fundNameBn: string;
  fundNameEn: string | null;
  restrictionType: string;
  incomePoisha: number;
  expensePoisha: number;
  closingCashPoisha: number;
}

export interface PublicTransactionRow {
  transactionId: string;
  entryDate: string;
  entryNumber: string;
  sourceType: string;
  labelBn: string;
  labelEn: string | null;
  amountPoisha: number;
  fundCode: string | null;
  fundNameBn: string | null;
}

export interface PublishedReportMeta {
  id: string;
  mosqueId: string;
  periodType: "month" | "year" | "custom";
  periodYear: number;
  periodMonth: number | null;
  periodStart: string;
  periodEnd: string;
  titleBn: string;
  titleEn: string | null;
  status: string;
  revision: number;
  publishedAt: string | null;
  snapshotPoisha: Record<string, unknown>;
  ledgerChecksum: string;
  notesPublicBn: string | null;
  notesPublicEn: string | null;
}

export interface PublicMosqueProfile {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string | null;
  publicProfileEnabled: boolean;
}
