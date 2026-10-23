import { describe, it, expect } from "vitest";
import {
  buildReportText,
  buildReportPdfBytes,
  extractTextFromSimplePdf,
} from "@/lib/reporting/pdf-report";
import { sanitizePublicPayload } from "@/lib/reporting/public-queries-safe";
import type { PublishedReportMeta } from "@/lib/reporting/types";

const sampleReport: PublishedReportMeta = {
  id: "r1",
  mosqueId: "m1",
  periodType: "month",
  periodYear: 2026,
  periodMonth: 10,
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  titleBn: "অক্টোবর প্রতিবেদন",
  titleEn: "October report",
  status: "published",
  revision: 2,
  publishedAt: "2026-11-01T10:00:00Z",
  snapshotPoisha: { income_poisha: 20000 },
  ledgerChecksum: "abc123",
  notesPublicBn: null,
  notesPublicEn: null,
};

describe("public report text & PDF", () => {
  it("includes period, revision, checksum and ledger-derived totals", () => {
    const text = buildReportText({
      mosqueNameBn: "মসজিদ পরীক্ষা",
      report: sampleReport,
      totals: {
        incomePoisha: 20000,
        expensePoisha: 5000,
        transferPoisha: 0,
        closingCashPoisha: 15000,
      },
      funds: [
        {
          fundId: "f1",
          fundCode: "GENERAL",
          fundNameBn: "সাধারণ",
          fundNameEn: "General",
          restrictionType: "unrestricted",
          incomePoisha: 20000,
          expensePoisha: 5000,
          closingCashPoisha: 15000,
        },
      ],
      locale: "bn",
    });

    expect(text).toContain("2026-10-01");
    expect(text).toContain("2026-10-31");
    expect(text).toContain("সংস্করণ: 2");
    expect(text).toContain("abc123");
    expect(text).toContain("200.00"); // 20000 poisha
    expect(text).not.toContain("donor_phone");
  });

  it("PDF contains extractable report lines", () => {
    const bytes = buildReportPdfBytes({
      mosqueNameBn: "Test Mosque",
      mosqueNameEn: "Test Mosque",
      report: { ...sampleReport, titleBn: "October Report" },
      totals: {
        incomePoisha: 10000,
        expensePoisha: 0,
        transferPoisha: 0,
        closingCashPoisha: 10000,
      },
      funds: [],
      locale: "en",
    });

    expect(bytes[0]).toBe(0x25); // %
    const extracted = extractTextFromSimplePdf(bytes);
    expect(extracted).toContain("October report");
    expect(extracted).toContain("Ledger checksum: abc123");
    expect(extracted).toContain("100.00");
  });
});

describe("sanitize public payload", () => {
  it("strips private fields", () => {
    const clean = sanitizePublicPayload({
      label: "Donation",
      amount: 100,
      phone: "01700000000",
      donor_email: "x@y.com",
      storage_path: "secret",
      memo: "internal",
    });
    expect(clean.label).toBe("Donation");
    expect(clean.amount).toBe(100);
    expect(clean).not.toHaveProperty("phone");
    expect(clean).not.toHaveProperty("donor_email");
    expect(clean).not.toHaveProperty("storage_path");
    expect(clean).not.toHaveProperty("memo");
  });
});
