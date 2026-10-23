"use client";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_ANNOUNCEMENTS } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";

export default function AnnouncementsPage() {
  const { locale, t } = useLocale();
  const list = DEMO_ANNOUNCEMENTS.filter((a) => a.visibility === "public");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{t("nav.announcements")}</h1>
      <div className="space-y-4">
        {list.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{locale === "bn" ? a.titleBn : a.titleEn}</CardTitle>
              <p className="text-xs text-stone-500">{formatDate(a.publishedAt, locale)}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-700 leading-relaxed">
                {locale === "bn" ? a.bodyBn : a.bodyEn}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
