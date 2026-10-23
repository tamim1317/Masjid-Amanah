"use client";

import { useLocale } from "@/components/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_DONATION_FUNDS } from "@/lib/donations/demo-config";

/**
 * Admin view — demo workflow only.
 * Does not list real paid donations; explains future reconciliation.
 */
export default function AdminDonationsPage() {
  const { locale } = useLocale();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          {locale === "bn" ? "ডিজিটাল অনুদান" : "Digital donations"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {locale === "bn"
            ? "ডেমো পর্যায় — আসল পেমেন্ট সংগ্রহ বা লেজারে স্বয়ংক্রিয় পোস্ট নেই।"
            : "Demo phase — no real collection or automatic ledger posting."}
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "bn" ? "গুরুত্বপূর্ণ" : "Important"}
          </CardTitle>
          <CardDescription className="text-amber-950">
            {locale === "bn"
              ? "সফল পেমেন্ট শুধুমাত্র গেটওয়ে কলব্যাক যাচাই ও সার্ভার-সাইড স্ট্যাটাস কুয়েরির পর লেজারে যাবে। ফ্রন্টএন্ড রিডাইরেক্টকে পেমেন্ট সফল ধরা যাবে না।"
              : "Payments may only post to the ledger after gateway callback verification and server-side status checks. Frontend redirects alone must never be treated as paid."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "bn" ? "তহবিল কনফিগ (ডেমো)" : "Fund config (demo)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "bn" ? "কোড" : "Code"}</TableHead>
                <TableHead>{locale === "bn" ? "নাম" : "Name"}</TableHead>
                <TableHead>{locale === "bn" ? "সক্রিয়" : "Enabled"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_DONATION_FUNDS.map((f) => (
                <TableRow key={f.code}>
                  <TableCell className="font-mono text-xs">{f.code}</TableCell>
                  <TableCell>
                    {locale === "bn" ? f.nameBn : f.nameEn}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.enabled ? "success" : "muted"}>
                      {f.enabled
                        ? locale === "bn"
                          ? "হ্যাঁ"
                          : "Yes"
                        : locale === "bn"
                          ? "না"
                          : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "bn" ? "ডেমো প্রচেষ্টা" : "Demo attempts"}
          </CardTitle>
          <CardDescription>
            {locale === "bn"
              ? "কোনো সফল পেমেন্ট রেকর্ড নেই — ডেমো মোড paid মার্ক করে না।"
              : "No successful payment records — demo mode never marks paid."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            {locale === "bn"
              ? "পাবলিক ফর্ম থেকে তৈরি attempt শুধুমাত্র demo_not_processed স্ট্যাটাসে থাকে।"
              : "Attempts from the public form remain status demo_not_processed only."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
