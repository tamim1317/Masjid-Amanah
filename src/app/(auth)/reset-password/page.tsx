"use client";

import { useState } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/auth/actions";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const { locale, setLocale, t } = useLocale();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await updatePassword({ password, locale });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
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
          <CardTitle>{locale === "bn" ? "নতুন পাসওয়ার্ড" : "New password"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{locale === "bn" ? "নতুন পাসওয়ার্ড" : "New password"}</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {locale === "bn" ? "সংরক্ষণ" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
