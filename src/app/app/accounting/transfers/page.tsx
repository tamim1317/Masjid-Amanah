"use client";
import { useLocale } from "@/components/locale-provider";
import { EmptyState } from "@/components/ui/states";

export default function TransfersPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold">{t("admin.transfers")}</h1>
      <EmptyState
        locale={locale}
        title={locale === "bn" ? "কোনো স্থানান্তর নেই" : "No transfers"}
        description={locale === "bn" ? "ডেমো ডেটাতে স্থানান্তর এন্ট্রি নেই।" : "No transfer entries in demo data."}
      />
    </div>
  );
}
