import { AlertTriangle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function DemoBanner({ locale = "bn" }: { locale?: Locale }) {
  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
      role="status"
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("common.demo", locale)} —{" "}
        {locale === "bn"
          ? "এটি শুধুমাত্র প্রদর্শনী ডেটা। কোনো বাস্তব লেনদেন বা অর্থপ্রদান নেই।"
          : "Demonstration data only. No real transactions or payments."}
      </span>
    </div>
  );
}
