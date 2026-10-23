"use client";

import Link from "next/link";
import { Landmark, ArrowRight, Shield, BookOpen, Users } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBanner } from "@/components/demo-banner";
import { DEMO_MOSQUE } from "@/lib/demo-data";

export default function HomePage() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner locale={locale} />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-stone-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Landmark className="h-4 w-4" />
            </span>
            {t("brand.name")}
          </div>
          <LanguageToggle locale={locale} onChange={setLocale} />
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-emerald-700">
              {t("brand.tagline")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              {locale === "bn"
                ? "মসজিদ ব্যবস্থাপনার জন্য বিশ্বস্ত প্ল্যাটফর্ম"
                : "A trustworthy platform for mosque management"}
            </h1>
            <p className="mt-4 text-base text-stone-600 leading-relaxed">
              {locale === "bn"
                ? "বাংলা-প্রথম, মাল্টি-টেন্যান্ট সফটওয়্যার — হিসাব, তহবিল, অনুমোদন ও স্বচ্ছতা একসাথে।"
                : "Bangla-first, multi-tenant software — accounting, funds, approvals, and transparency together."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href={`/m/${DEMO_MOSQUE.slug}`}>
                  {locale === "bn" ? "ডেমো মসজিদ দেখুন" : "View demo mosque"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/dashboard">
                  {locale === "bn" ? "অ্যাডমিন ড্যাশবোর্ড" : "Admin dashboard"}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/platform">
                  {locale === "bn" ? "প্ল্যাটফর্ম" : "Platform"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BookOpen,
                titleBn: "দ্বৈত-এন্ট্রি হিসাব",
                titleEn: "Double-entry books",
                descBn: "তহবিল-সীমাবদ্ধ জার্নাল, অনুমোদন ও অডিট ট্রেইল।",
                descEn: "Fund-restricted journals, approvals, and audit trail.",
              },
              {
                icon: Shield,
                titleBn: "টেন্যান্ট আইসোলেশন",
                titleEn: "Tenant isolation",
                descBn: "প্রতিটি মসজিদের ডেটা পৃথক ও সুরক্ষিত।",
                descEn: "Each mosque data is isolated and protected.",
              },
              {
                icon: Users,
                titleBn: "ভূমিকা-ভিত্তিক অ্যাক্সেস",
                titleEn: "Role-based access",
                descBn: "কোষাধ্যক্ষ, অনুমোদনকারী, কমিটি — স্পষ্ট অনুমতি।",
                descEn: "Treasurer, approver, committee — clear permissions.",
              },
            ].map((f) => (
              <Card key={f.titleEn}>
                <CardHeader>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <CardTitle>
                    {locale === "bn" ? f.titleBn : f.titleEn}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600">
                    {locale === "bn" ? f.descBn : f.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        UI foundation demo · No authentication or payments implemented
      </footer>
    </div>
  );
}
