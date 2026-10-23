"use client";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { StatusLabel } from "@/components/ui/status-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEMO_TENANTS } from "@/lib/demo-data";

export default function PlatformTenantsPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">{t("platform.tenants")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_TENANTS.map((tn) => (
          <Card key={tn.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base">
                {locale === "bn" ? tn.nameBn : tn.nameEn}
              </CardTitle>
              <StatusLabel status={tn.status} locale={locale} />
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-stone-600">
              <span>{tn.users} users · /{tn.slug}</span>
              <Button asChild variant="outline" size="sm">
                <Link href={`/m/${tn.slug}`}>{t("common.view")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
