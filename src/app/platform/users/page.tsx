"use client";
import { useLocale } from "@/components/locale-provider";
import { EmptyState } from "@/components/ui/states";

export default function PlatformUsersPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold">{t("platform.users")}</h1>
      <EmptyState
        locale={locale}
        description={locale === "bn" ? "প্ল্যাটফর্ম ব্যবহারকারী তালিকা এখনও নেই।" : "Platform user list not implemented."}
      />
    </div>
  );
}
