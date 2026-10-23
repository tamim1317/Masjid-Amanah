"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPassword } from "@/lib/auth/actions";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await signInWithPassword({ email, password, locale });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          {t("brand.name")}
        </Link>
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {locale === "bn" ? "প্রবেশ করুন" : "Sign in"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {locale === "bn" ? "ইমেইল" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {locale === "bn" ? "পাসওয়ার্ড" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending
                ? locale === "bn"
                  ? "অপেক্ষা করুন…"
                  : "Please wait…"
                : locale === "bn"
                  ? "প্রবেশ"
                  : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-center text-sm text-stone-600">
            <Link
              href="/forgot-password"
              className="text-emerald-700 hover:underline"
            >
              {locale === "bn" ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}
            </Link>
            <Link href="/signup" className="text-emerald-700 hover:underline">
              {locale === "bn" ? "নতুন অ্যাকাউন্ট" : "Create account"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">…</div>}>
      <LoginForm />
    </Suspense>
  );
}
