"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { acceptInvitation } from "@/lib/auth/actions";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function InviteForm() {
  const { locale, setLocale, t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAccept() {
    setPending(true);
    setError(null);
    const result = await acceptInvitation({ token, locale });
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
          <CardTitle>{locale === "bn" ? "মসজিদ আমন্ত্রণ" : "Mosque invitation"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <p className="text-sm text-red-700">
              {locale === "bn" ? "আমন্ত্রণ টোকেন নেই।" : "Missing invitation token."}
            </p>
          )}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
          <Button onClick={onAccept} disabled={!token || pending} className="w-full">
            {locale === "bn" ? "আমন্ত্রণ গ্রহণ করুন" : "Accept invitation"}
          </Button>
          <p className="text-center text-sm text-stone-500">
            {locale === "bn"
              ? "গ্রহণের আগে লগ ইন করা থাকতে হবে।"
              : "You must be signed in before accepting."}
          </p>
          <p className="text-center text-sm">
            <Link href="/login" className="text-emerald-700 hover:underline">
              {locale === "bn" ? "প্রবেশ করুন" : "Sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">…</div>}>
      <InviteForm />
    </Suspense>
  );
}
