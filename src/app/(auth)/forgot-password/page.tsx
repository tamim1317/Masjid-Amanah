"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordRecovery } from "@/lib/auth/actions";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const { locale, setLocale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await requestPasswordRecovery({ email, locale });
    setPending(false);
    setMessage(result.message ?? null);
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-emerald-800">{t("brand.name")}</Link>
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{locale === "bn" ? "পাসওয়ার্ড পুনরুদ্ধার" : "Password recovery"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{locale === "bn" ? "ইমেইল" : "Email"}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {message && <p className="text-sm text-emerald-800" role="status">{message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {locale === "bn" ? "লিংক পাঠান" : "Send link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-emerald-700 hover:underline">
              {locale === "bn" ? "প্রবেশ পৃষ্ঠায় ফিরুন" : "Back to sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
