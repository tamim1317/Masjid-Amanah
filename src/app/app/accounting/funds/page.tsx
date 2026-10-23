"use client";
import { useLocale } from "@/components/locale-provider";
import { FinancialCard } from "@/components/ui/financial-card";
import { DEMO_FUNDS } from "@/lib/demo-data";

export default function FundsPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-semibold">{t("admin.funds")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_FUNDS.map((f) => (
          <FinancialCard
            key={f.id}
            title={locale === "bn" ? f.nameBn : f.nameEn}
            amount={f.balance}
            locale={locale}
            status={f.status}
            subtitle={f.code}
          />
        ))}
      </div>
    </div>
  );
}
