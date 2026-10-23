import { Info } from "lucide-react";
import { DonationForm } from "@/components/donations/donation-form";
import { DEMO_DONATION_DISCLAIMER } from "@/lib/donations/demo-config";

export default async function DonatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          ডিজিটাল অনুদান
        </h1>
        <p className="mt-1 text-sm text-stone-500">Digital donation</p>
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {DEMO_DONATION_DISCLAIMER.demoBn}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {DEMO_DONATION_DISCLAIMER.privacyBn}
        </p>
      </div>
      <DonationForm mosqueSlug={slug} />
    </div>
  );
}
