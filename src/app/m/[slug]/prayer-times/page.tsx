"use client";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_PRAYER_TIMES } from "@/lib/demo-data";

export default function PrayerTimesPage() {
  const { locale, t } = useLocale();
  const times = [
    { key: "Fajr", bn: "ফজর", v: DEMO_PRAYER_TIMES.fajr },
    { key: "Sunrise", bn: "সূর্যোদয়", v: DEMO_PRAYER_TIMES.sunrise },
    { key: "Dhuhr", bn: "যোহর", v: DEMO_PRAYER_TIMES.dhuhr },
    { key: "Asr", bn: "আসর", v: DEMO_PRAYER_TIMES.asr },
    { key: "Maghrib", bn: "মাগরিব", v: DEMO_PRAYER_TIMES.maghrib },
    { key: "Isha", bn: "এশা", v: DEMO_PRAYER_TIMES.isha },
    { key: "Jumuah", bn: "জুমআ", v: DEMO_PRAYER_TIMES.jumuah },
  ];
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{t("nav.prayer")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-stone-500">
            {DEMO_PRAYER_TIMES.date} · Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            {times.map((row) => (
              <div key={row.key} className="flex justify-between border-b border-stone-50 pb-2 last:border-0">
                <dt className="text-stone-600">{locale === "bn" ? row.bn : row.key}</dt>
                <dd className="font-semibold tabular-nums">{row.v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
