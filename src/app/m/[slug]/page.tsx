"use client";

import Link from "next/link";
import { Clock, Megaphone, MapPin, Phone } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DEMO_MOSQUE,
  DEMO_PRAYER_TIMES,
  DEMO_ANNOUNCEMENTS,
} from "@/lib/demo-data";

export default function MosqueHomePage() {
  const { locale, t } = useLocale();
  const name = locale === "bn" ? DEMO_MOSQUE.nameBn : DEMO_MOSQUE.nameEn;
  const address =
    locale === "bn" ? DEMO_MOSQUE.addressBn : DEMO_MOSQUE.addressEn;
  const imam = locale === "bn" ? DEMO_MOSQUE.imamBn : DEMO_MOSQUE.imamEn;
  const publicAnnouncements = DEMO_ANNOUNCEMENTS.filter(
    (a) => a.visibility === "public"
  ).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          {name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {address}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {DEMO_MOSQUE.phone}
          </span>
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {locale === "bn" ? "ইমাম" : "Imam"}: {imam}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              {t("nav.prayer")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {[
                ["ফজর / Fajr", DEMO_PRAYER_TIMES.fajr],
                ["যোহর / Dhuhr", DEMO_PRAYER_TIMES.dhuhr],
                ["আসর / Asr", DEMO_PRAYER_TIMES.asr],
                ["মাগরিব / Maghrib", DEMO_PRAYER_TIMES.maghrib],
                ["এশা / Isha", DEMO_PRAYER_TIMES.isha],
              ].map(([label, time]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-stone-50 py-1.5 last:border-0"
                >
                  <dt className="text-stone-600">{label}</dt>
                  <dd className="font-medium tabular-nums text-stone-900">
                    {time}
                  </dd>
                </div>
              ))}
            </dl>
            <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
              <Link href={`/m/${DEMO_MOSQUE.slug}/prayer-times`}>
                {locale === "bn" ? "বিস্তারিত" : "Details"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-700" />
              {t("nav.announcements")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {publicAnnouncements.map((a) => (
              <article
                key={a.id}
                className="border-b border-stone-100 pb-4 last:border-0 last:pb-0"
              >
                <h3 className="font-medium text-stone-900">
                  {locale === "bn" ? a.titleBn : a.titleEn}
                </h3>
                <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                  {locale === "bn" ? a.bodyBn : a.bodyEn}
                </p>
              </article>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link href={`/m/${DEMO_MOSQUE.slug}/announcements`}>
                {locale === "bn" ? "সব ঘোষণা" : "All announcements"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/m/${DEMO_MOSQUE.slug}/donate`}>
            {t("nav.donate")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/m/${DEMO_MOSQUE.slug}/reports/public`}>
            {t("nav.finance")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/m/${DEMO_MOSQUE.slug}/contact`}>
            {t("nav.contact")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
