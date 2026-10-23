import Link from "next/link";
import { Info } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getPublicMosqueBySlug,
  getPublicPeriodTotals,
  getPublicFundTotals,
  searchPublicTransactions,
  getPublishedReports,
} from "@/lib/reporting/public-queries";
import { formatPoisha } from "@/lib/accounting/types";
import { PublicFinanceClient } from "@/components/reporting/public-finance-client";

function defaultPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default async function PublicFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; q?: string; fund?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const period = defaultPeriod();
  const from = sp.from ?? period.start;
  const to = sp.to ?? period.end;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold">আর্থিক প্রতিবেদন</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ডাটাবেস সংযোগ কনফিগার করা নেই। প্রকাশিত লেজার থেকে প্রতিবেদন দেখাতে
          পরিবেশ ভেরিয়েবল সেট করুন। হার্ডকোডেড ডেমো মোট দেখানো হচ্ছে না।
        </p>
      </div>
    );
  }

  const mosque = await getPublicMosqueBySlug(slug);
  if (!mosque) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-semibold">মসজিদ পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-stone-600">
          এই মসজিদের পাবলিক প্রোফাইল নেই বা সক্রিয় নয়।
        </p>
      </div>
    );
  }

  const [totals, funds, transactions, reports] = await Promise.all([
    getPublicPeriodTotals(mosque.id, from, to),
    getPublicFundTotals(mosque.id, from, to),
    searchPublicTransactions({
      mosqueId: mosque.id,
      start: from,
      end: to,
      fundId: sp.fund,
      search: sp.q,
      limit: 50,
    }),
    getPublishedReports(mosque.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">
          আর্থিক স্বচ্ছতা · {mosque.nameBn}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{mosque.nameEn}</p>
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          শুধুমাত্র পোস্টেড ও প্রকাশিত এন্ট্রি দেখানো হয়। খসড়া, অপেক্ষমাণ অনুমোদন,
          দাতার ফোন/ইমেইল বা অভ্যন্তরীণ নোট প্রকাশিত হয় না।
        </p>
        <p className="mt-2 text-xs text-stone-500">
          সময়কাল: {from} — {to}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "আয়", value: totals.incomePoisha },
          { label: "ব্যয়", value: totals.expensePoisha },
          { label: "স্থানান্তর", value: totals.transferPoisha },
          { label: "সমাপনী নগদ", value: totals.closingCashPoisha },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-stone-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatPoisha(c.value, "bn")}
            </p>
          </div>
        ))}
      </div>

      <PublicFinanceClient
        slug={slug}
        mosqueId={mosque.id}
        from={from}
        to={to}
        funds={funds}
        transactions={transactions}
        reports={reports}
        initialQuery={sp.q ?? ""}
      />

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/m/${slug}/reports/public/pdf?from=${from}&to=${to}`}
          className="text-emerald-700 hover:underline"
        >
          PDF প্রতিবেদন
        </Link>
        <Link href={`/m/${slug}`} className="text-stone-600 hover:underline">
          মসজিদ হোম
        </Link>
      </div>
    </div>
  );
}
