"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLocale } from "@/components/locale-provider";
import { FinancialCard } from "@/components/ui/financial-card";
import { StatusLabel } from "@/components/ui/status-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DEMO_FUNDS,
  DEMO_TRANSACTIONS,
  DEMO_MONTHLY_SERIES,
} from "@/lib/demo-data";
import { formatBDT, formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { locale, t } = useLocale();
  const totalBalance = DEMO_FUNDS.reduce((s, f) => s + f.balance, 0);
  const pending = DEMO_TRANSACTIONS.filter(
    (tx) => tx.status === "pending_approval"
  );
  const chartData = DEMO_MONTHLY_SERIES.map((m) => ({
    name: locale === "bn" ? m.month : m.monthEn,
    income: m.income,
    expense: m.expense,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            {t("dash.welcome")}
          </h1>
          <p className="text-sm text-stone-500">{t("dash.overview")} · Demo</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/accounting/approvals">
            {t("dash.pending_approvals")} ({pending.length})
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialCard
          title={locale === "bn" ? "মোট ব্যালেন্স" : "Total balance"}
          amount={totalBalance}
          locale={locale}
        />
        {DEMO_FUNDS.slice(0, 3).map((f) => (
          <FinancialCard
            key={f.id}
            title={locale === "bn" ? f.nameBn : f.nameEn}
            amount={f.balance}
            locale={locale}
            status={f.status}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "bn" ? "মাসিক আয়-ব্যয় (ডেমো)" : "Monthly income/expense (demo)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  formatter={(v: number) => formatBDT(v, locale)}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4" }}
                />
                <Legend />
                <Bar dataKey="income" name={t("finance.income")} fill="#047857" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t("finance.expense")} fill="#a8a29e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("dash.pending_approvals")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-stone-500">{t("common.empty")}</p>
            ) : (
              pending.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-amber-100 bg-amber-50/50 p-3"
                >
                  <p className="text-sm font-medium text-stone-900">
                    {locale === "bn" ? tx.descriptionBn : tx.descriptionEn}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDate(tx.date, locale)} · {formatBDT(tx.amount, locale)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dash.recent")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead>{locale === "bn" ? "বিবরণ" : "Description"}</TableHead>
                <TableHead className="text-right">{locale === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                <TableHead>{locale === "bn" ? "অবস্থা" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_TRANSACTIONS.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-stone-600">
                    {formatDate(tx.date, locale)}
                  </TableCell>
                  <TableCell>
                    {locale === "bn" ? tx.descriptionBn : tx.descriptionEn}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {tx.type === "income" ? "+" : "−"}
                    {formatBDT(tx.amount, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusLabel status={tx.status} locale={locale} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
