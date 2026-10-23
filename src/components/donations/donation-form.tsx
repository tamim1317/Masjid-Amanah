"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPoisha } from "@/lib/accounting/types";
import {
  DEMO_DONATION_DISCLAIMER,
  DEMO_DONATION_FUNDS,
  DEMO_PRESET_BDT,
} from "@/lib/donations/demo-config";
import type {
  DonationFundCode,
  DonationReceiptPreview,
  DonationVisibility,
} from "@/lib/donations/types";
import { cn } from "@/lib/utils";

function bdtToPoisha(bdt: number): number {
  return Math.round(bdt * 100);
}

export function DonationForm({ mosqueSlug }: { mosqueSlug: string }) {
  const { locale } = useLocale();
  const funds = DEMO_DONATION_FUNDS.filter((f) => f.enabled);

  const [presetBdt, setPresetBdt] = useState<number | null>(500);
  const [customBdt, setCustomBdt] = useState("");
  const [fundCode, setFundCode] = useState<DonationFundCode>("GENERAL");
  const [visibility, setVisibility] =
    useState<DonationVisibility>("anonymous_public");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DonationReceiptPreview | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const amountPoisha = useMemo(() => {
    if (customBdt.trim()) {
      const n = Number(customBdt);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return bdtToPoisha(n);
    }
    if (presetBdt != null) return bdtToPoisha(presetBdt);
    return 0;
  }, [customBdt, presetBdt]);

  const selectedFund = funds.find((f) => f.code === fundCode);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReceipt(null);
    setServerMessage(null);

    if (amountPoisha < 100) {
      setError(
        locale === "bn" ? "কমপক্ষে ১ টাকা দিন।" : "Minimum 1 BDT."
      );
      return;
    }
    if (visibility === "public_name" && displayName.trim().length < 2) {
      setError(
        locale === "bn"
          ? "প্রকাশ্য নাম লিখুন।"
          : "Enter a display name for public listing."
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/donations/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug,
          amountPoisha,
          fundCode,
          visibility,
          displayName: visibility === "public_name" ? displayName : undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.messageBn && locale === "bn"
            ? data.messageBn
            : data.messageEn ||
                (locale === "bn" ? "অনুরোধ ব্যর্থ।" : "Request failed.")
        );
        return;
      }
      setServerMessage(
        locale === "bn" ? data.messageBn : data.messageEn
      );
      setReceipt(data.receipt as DonationReceiptPreview);
    } catch {
      setError(locale === "bn" ? "নেটওয়ার্ক ত্রুটি।" : "Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={onSubmit} className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "অনুদানের পরিমাণ" : "Donation amount"}
            </CardTitle>
            <CardDescription>
              {locale === "bn"
                ? "নির্ধারিত বা কাস্টম টাকা (BDT)"
                : "Preset or custom amount (BDT)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DEMO_PRESET_BDT.map((bdt) => (
                <Button
                  key={bdt}
                  type="button"
                  variant={
                    presetBdt === bdt && !customBdt ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    setPresetBdt(bdt);
                    setCustomBdt("");
                  }}
                >
                  ৳{bdt.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom">
                {locale === "bn" ? "কাস্টম পরিমাণ (টাকা)" : "Custom amount (BDT)"}
              </Label>
              <Input
                id="custom"
                inputMode="decimal"
                placeholder="e.g. 250"
                value={customBdt}
                onChange={(e) => {
                  setCustomBdt(e.target.value);
                  setPresetBdt(null);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "তহবিল" : "Fund"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funds.map((f) => (
              <label
                key={f.code}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  fundCode === f.code
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-stone-200"
                )}
              >
                <input
                  type="radio"
                  name="fund"
                  className="mt-1"
                  checked={fundCode === f.code}
                  onChange={() => setFundCode(f.code)}
                />
                <span>
                  <span className="font-medium">
                    {locale === "bn" ? f.nameBn : f.nameEn}
                  </span>
                  {f.requiresEligibilityNote && (
                    <span className="mt-1 block text-xs text-stone-600">
                      {locale === "bn" ? f.noteBn : f.noteEn}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "bn" ? "নাম প্রকাশ" : "Public display"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer gap-3 rounded-lg border border-stone-200 p-3">
              <input
                type="radio"
                name="vis"
                className="mt-1"
                checked={visibility === "anonymous_public"}
                onChange={() => setVisibility("anonymous_public")}
              />
              <span>
                <span className="font-medium">
                  {locale === "bn"
                    ? "পাবলিক রিপোর্টে বেনামী"
                    : "Anonymous in public reports"}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-stone-200 p-3">
              <input
                type="radio"
                name="vis"
                className="mt-1"
                checked={visibility === "public_name"}
                onChange={() => setVisibility("public_name")}
              />
              <span className="font-medium">
                {locale === "bn"
                  ? "নাম প্রকাশ করতে চাই"
                  : "Show my name publicly"}
              </span>
            </label>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {locale === "bn"
                ? DEMO_DONATION_DISCLAIMER.privacyBn
                : DEMO_DONATION_DISCLAIMER.privacyEn}
            </p>

            {visibility === "public_name" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  {locale === "bn" ? "প্রদর্শনের নাম *" : "Display name *"}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={visibility === "public_name"}
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {locale === "bn"
                    ? "ইমেইল (ঐচ্ছিক / প্রয়োজন হলে)"
                    : "Email (optional / if required)"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {locale === "bn"
                    ? "ফোন (ঐচ্ছিক / প্রয়োজন হলে)"
                    : "Phone (optional / if required)"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-stone-500">
              {locale === "bn"
                ? "যোগাযোগের তথ্য পাবলিক পাতায় দেখানো হয় না।"
                : "Contact details are never shown on public pages."}
            </p>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
          {pending
            ? locale === "bn"
              ? "অপেক্ষা করুন…"
              : "Please wait…"
            : locale === "bn"
              ? "ডেমো রসিদ দেখুন"
              : "Show demo receipt"}
        </Button>
        <p className="text-xs text-stone-500">
          {locale === "bn"
            ? DEMO_DONATION_DISCLAIMER.demoBn
            : DEMO_DONATION_DISCLAIMER.demoEn}
        </p>
      </form>

      <div className="space-y-4 lg:col-span-2">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "bn" ? "সারসংক্ষেপ" : "Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-stone-500">
                {locale === "bn" ? "পরিমাণ: " : "Amount: "}
              </span>
              <span className="font-semibold tabular-nums">
                {formatPoisha(amountPoisha, locale)}
              </span>
            </p>
            <p>
              <span className="text-stone-500">
                {locale === "bn" ? "তহবিল: " : "Fund: "}
              </span>
              {selectedFund
                ? locale === "bn"
                  ? selectedFund.nameBn
                  : selectedFund.nameEn
                : "—"}
            </p>
            <p>
              <span className="text-stone-500">
                {locale === "bn" ? "প্রকাশ: " : "Display: "}
              </span>
              {visibility === "anonymous_public"
                ? locale === "bn"
                  ? "বেনামী (পাবলিক)"
                  : "Anonymous (public)"
                : locale === "bn"
                  ? `নাম: ${displayName || "—"}`
                  : `Name: ${displayName || "—"}`}
            </p>
          </CardContent>
        </Card>

        {receipt && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "bn" ? "রসিদ প্রিভিউ" : "Receipt preview"}
              </CardTitle>
              <CardDescription className="font-medium text-amber-900">
                {locale === "bn"
                  ? "ডেমো মোড — পেমেন্ট প্রক্রিয়া হয়নি"
                  : "Demo only — payment not processed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-mono text-xs text-stone-600">
                ID: {receipt.attemptId}
              </p>
              <p>
                {locale === "bn" ? "স্থিতি: " : "Status: "}
                <strong>{receipt.status}</strong>
              </p>
              <p className="tabular-nums">
                {formatPoisha(receipt.amountPoisha, locale)}
              </p>
              <p>
                {receipt.visibility === "anonymous_public"
                  ? locale === "bn"
                    ? "পাবলিক নাম: বেনামী"
                    : "Public name: Anonymous"
                  : `${locale === "bn" ? "পাবলিক নাম: " : "Public name: "}${receipt.publicDisplayName}`}
              </p>
              {serverMessage && (
                <p className="text-amber-950">{serverMessage}</p>
              )}
              <p className="text-xs text-stone-600">
                {locale === "bn" ? receipt.disclaimerBn : receipt.disclaimerEn}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
