"use client";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MOSQUE } from "@/lib/demo-data";

export default function ContactPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{t("nav.contact")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "bn" ? DEMO_MOSQUE.nameBn : DEMO_MOSQUE.nameEn}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-stone-700">
          <p>{locale === "bn" ? DEMO_MOSQUE.addressBn : DEMO_MOSQUE.addressEn}</p>
          <p>📞 {DEMO_MOSQUE.phone}</p>
          <p>✉️ {DEMO_MOSQUE.email}</p>
          <p>
            {locale === "bn" ? "ইমাম" : "Imam"}:{" "}
            {locale === "bn" ? DEMO_MOSQUE.imamBn : DEMO_MOSQUE.imamEn}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
