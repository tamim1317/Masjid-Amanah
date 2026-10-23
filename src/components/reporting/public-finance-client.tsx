"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPoisha } from "@/lib/accounting/types";
import type {
  FundPublicTotal,
  PublicTransactionRow,
  PublishedReportMeta,
} from "@/lib/reporting/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  slug: string;
  mosqueId: string;
  from: string;
  to: string;
  funds: FundPublicTotal[];
  transactions: PublicTransactionRow[];
  reports: PublishedReportMeta[];
  initialQuery: string;
}

export function PublicFinanceClient({
  slug,
  from,
  to,
  funds,
  transactions,
  reports,
  initialQuery,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (q.trim()) params.set("q", q.trim());
    router.push(`/m/${slug}/reports/public?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4"
      >
        <div>
          <label className="text-xs text-stone-500">শুরু</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500">শেষ</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="text-xs text-stone-500">অনুসন্ধান</label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="বিবরণ বা নম্বর…"
            className="mt-1"
          />
        </div>
        <Button type="submit">ফিল্টার</Button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          তহবিল (প্রকাশিত)
        </h2>
        {funds.length === 0 ? (
          <p className="text-sm text-stone-500">এই সময়ে প্রকাশিত তহবিল নেই।</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {funds.map((f) => (
              <Card key={f.fundId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{f.fundNameBn}</CardTitle>
                    <Badge variant="secondary">{f.restrictionType}</Badge>
                  </div>
                  <p className="text-xs text-stone-500">{f.fundCode}</p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>আয়: {formatPoisha(f.incomePoisha, "bn")}</p>
                  <p>ব্যয়: {formatPoisha(f.expensePoisha, "bn")}</p>
                  <p className="font-medium">
                    ব্যালেন্স: {formatPoisha(f.closingCashPoisha, "bn")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          লেনদেন (প্রকাশিত)
        </h2>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>তারিখ</TableHead>
                <TableHead>নম্বর</TableHead>
                <TableHead>বিবরণ</TableHead>
                <TableHead>তহবিল</TableHead>
                <TableHead className="text-right">পরিমাণ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-stone-500">
                    কোনো প্রকাশিত লেনদেন নেই
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.transactionId}>
                    <TableCell className="whitespace-nowrap text-stone-600">
                      {tx.entryDate}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.entryNumber}
                    </TableCell>
                    <TableCell>{tx.labelBn}</TableCell>
                    <TableCell className="text-stone-600">
                      {tx.fundNameBn ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatPoisha(tx.amountPoisha, "bn")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          প্রকাশিত প্রতিবেদন ও সংস্করণ
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-stone-500">এখনও কোনো প্রকাশিত প্রতিবেদন নেই।</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{r.titleBn}</p>
                  <p className="text-xs text-stone-500">
                    {r.periodStart} — {r.periodEnd} · সংস্করণ {r.revision} ·{" "}
                    {r.publishedAt
                      ? `প্রকাশ ${new Date(r.publishedAt).toLocaleString("bn-BD")}`
                      : ""}
                  </p>
                </div>
                <Badge variant="success">published</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
