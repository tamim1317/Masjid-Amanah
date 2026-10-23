"use client";
import { useLocale } from "@/components/locale-provider";
import { EmptyState } from "@/components/ui/states";

export default function Page() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold">{t("admin.users")}</h1>
      <EmptyState
        locale={locale}
        title={locale === "bn" ? "শীঘ্রই আসছে" : "Coming soon"}
        description={locale === "bn" ? "UI ফাউন্ডেশন — ব্যবসায়িক লজিক এখনও নেই।" : "UI foundation — business logic not yet implemented."}
      />
    </div>
  );
}
