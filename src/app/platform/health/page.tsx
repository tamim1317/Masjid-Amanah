"use client";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HealthPage() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">{t("platform.health")}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "API", value: "OK (demo)" },
          { label: "Database", value: "OK (demo)" },
          { label: "Storage", value: "OK (demo)" },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardTitle className="text-sm text-stone-500">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-emerald-700">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-stone-500">
        {locale === "bn"
          ? "এটি স্থির ডেমো মান — কোনো লাইভ হেলথ চেক নেই।"
          : "Static demo values — no live health checks."}
      </p>
    </div>
  );
}
