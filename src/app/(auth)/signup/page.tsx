"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const { locale, setLocale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await signUp({ email, password, fullName, locale });
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
          <CardTitle>{locale === "bn" ? "অ্যাকাউন্ট তৈরি" : "Create account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{locale === "bn" ? "নাম" : "Full name"}</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{locale === "bn" ? "ইমেইল" : "Email"}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{locale === "bn" ? "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" : "Password (min 8 chars)"}</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {locale === "bn" ? "নিবন্ধন" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-emerald-700 hover:underline">
              {locale === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে?" : "Already have an account?"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
