"use client";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountingPage() {
  const { locale, t } = useLocale();
  const links = [
    { href: "/app/accounting/funds", label: t("admin.funds") },
    { href: "/app/accounting/transfers", label: t("admin.transfers") },
    { href: "/app/accounting/approvals", label: t("admin.approvals") },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">{t("admin.accounting")}</h1>
      <p className="text-sm text-stone-500">
        {locale === "bn"
          ? "হিসাব মডিউলের UI ফাউন্ডেশন। ব্যবসায়িক লজিক এখনও সংযুক্ত নয়।"
          : "Accounting module UI foundation. Business logic not wired yet."}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <Card key={l.href}>
            <CardHeader>
              <CardTitle className="text-base">{l.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" size="sm">
                <Link href={l.href}>{t("common.view")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
