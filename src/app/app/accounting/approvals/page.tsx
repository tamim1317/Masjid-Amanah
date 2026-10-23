"use client";
import { useLocale } from "@/components/locale-provider";
import { StatusLabel } from "@/components/ui/status-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_TRANSACTIONS } from "@/lib/demo-data";
import { formatBDT, formatDate } from "@/lib/utils";

export default function ApprovalsPage() {
  const { locale, t } = useLocale();
  const pending = DEMO_TRANSACTIONS.filter((tx) => tx.status === "pending_approval");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">{t("admin.approvals")}</h1>
      {pending.map((tx) => (
        <Card key={tx.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <CardTitle className="text-base">
              {locale === "bn" ? tx.descriptionBn : tx.descriptionEn}
            </CardTitle>
            <StatusLabel status={tx.status} locale={locale} />
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            {formatDate(tx.date, locale)} · {tx.fundCode} · {formatBDT(tx.amount, locale)}
            <p className="mt-2 text-xs text-amber-700">
              {locale === "bn"
                ? "UI শুধু — অনুমোদন অ্যাকশন এখনও সংযুক্ত নয়"
                : "UI only — approve actions not wired"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
