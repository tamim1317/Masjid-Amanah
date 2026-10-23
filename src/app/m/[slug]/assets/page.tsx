"use client";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_ASSETS } from "@/lib/demo-data";
import { formatBDT } from "@/lib/utils";

export default function PublicAssetsPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{t("nav.assets")}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_ASSETS.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "bn" ? a.nameBn : a.nameEn}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              <p>{a.category} · {a.condition}</p>
              <p className="mt-1 font-medium text-stone-800 tabular-nums">
                {formatBDT(a.value, locale)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
