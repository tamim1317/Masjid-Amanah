import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getPublicMosqueBySlug,
  getPublicPeriodTotals,
  getPublicFundTotals,
  getPublishedReports,
} from "@/lib/reporting/public-queries";
import { buildReportPdfBytes } from "@/lib/reporting/pdf-report";
import type { PublishedReportMeta } from "@/lib/reporting/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "database_not_configured" },
      { status: 503 }
    );
  }

  const { slug } = await context.params;
  const url = new URL(request.url);
  const from =
    url.searchParams.get("from") ??
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  const to =
    url.searchParams.get("to") ??
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

  const mosque = await getPublicMosqueBySlug(slug);
  if (!mosque) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [totals, funds, reports] = await Promise.all([
    getPublicPeriodTotals(mosque.id, from, to),
    getPublicFundTotals(mosque.id, from, to),
    getPublishedReports(mosque.id),
  ]);

  const matching = reports.find(
    (r) => r.periodStart === from && r.periodEnd === to
  );

  const report: PublishedReportMeta = matching ?? {
    id: "live",
    mosqueId: mosque.id,
    periodType: "custom",
    periodYear: Number(from.slice(0, 4)),
    periodMonth: null,
    periodStart: from,
    periodEnd: to,
    titleBn: "লাইভ আর্থিক সারসংক্ষেপ",
    titleEn: "Live financial summary",
    status: "published",
    revision: 0,
    publishedAt: new Date().toISOString(),
    snapshotPoisha: {
      income_poisha: totals.incomePoisha,
      expense_poisha: totals.expensePoisha,
    },
    ledgerChecksum: "live",
    notesPublicBn: null,
    notesPublicEn: null,
  };

  const bytes = buildReportPdfBytes({
    mosqueNameBn: mosque.nameBn,
    mosqueNameEn: mosque.nameEn,
    report,
    totals,
    funds,
    locale: "bn",
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${slug}-${from}-${to}.pdf"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
