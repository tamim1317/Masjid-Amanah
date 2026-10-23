import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/donations/provider";
import { toPublicDonationFields } from "@/lib/donations/provider";
import type {
  DonationFundCode,
  DonationIntentInput,
  DonationReceiptPreview,
  DonationVisibility,
} from "@/lib/donations/types";
import { rateLimit } from "@/lib/security/rate-limit";
import { DEMO_DONATION_DISCLAIMER } from "@/lib/donations/demo-config";

const ALLOWED_FUNDS: DonationFundCode[] = [
  "GENERAL",
  "CONSTRUCTION",
  "ZAKAT",
  "OTHER",
];

/**
 * Demo donation initiate — never marks payment as paid.
 * Real gateways must verify server-side callbacks before ledger posting (future).
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit({
    key: `donations:initiate:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        messageBn: "অনেকবার চেষ্টা হয়েছে।",
        messageEn: "Too many attempts.",
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, status: "failed" }, { status: 400 });
  }

  const amountPoisha = Number(body.amountPoisha);
  const fundCode = String(body.fundCode ?? "") as DonationFundCode;
  const visibility = String(body.visibility ?? "") as DonationVisibility;
  const mosqueSlug = String(body.mosqueSlug ?? "").slice(0, 80);

  if (
    !Number.isInteger(amountPoisha) ||
    amountPoisha < 100 ||
    amountPoisha > 10_000_000_00
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        messageBn: "পরিমাণ অবৈধ (কমপক্ষে ১ টাকা)।",
        messageEn: "Invalid amount (minimum 1 BDT).",
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_FUNDS.includes(fundCode)) {
    return NextResponse.json(
      { ok: false, status: "failed", messageBn: "তহবিল অবৈধ।" },
      { status: 400 }
    );
  }

  if (visibility !== "public_name" && visibility !== "anonymous_public") {
    return NextResponse.json(
      { ok: false, status: "failed", messageBn: "গোপনীয়তা পছন্দ অবৈধ।" },
      { status: 400 }
    );
  }

  if (visibility === "public_name") {
    const name = String(body.displayName ?? "").trim();
    if (name.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          status: "failed",
          messageBn: "প্রদর্শনের নাম প্রয়োজন।",
          messageEn: "Display name is required.",
        },
        { status: 400 }
      );
    }
  }

  // Force demo provider in this phase — no live credentials used
  const provider = getPaymentProvider("demo");
  const intent: DonationIntentInput = {
    mosqueSlug,
    amountPoisha,
    fundCode,
    visibility,
    displayName: body.displayName ? String(body.displayName) : undefined,
    contactEmail: body.contactEmail ? String(body.contactEmail) : undefined,
    contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
  };

  const result = await provider.initiate(intent);

  // Never escalate demo_not_processed to paid_verified
  if (result.status === "paid_verified") {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        messageBn: "অবৈধ পেমেন্ট অবস্থা।",
        messageEn: "Invalid payment status.",
      },
      { status: 500 }
    );
  }

  const publicFields = toPublicDonationFields(intent);

  const receipt: DonationReceiptPreview = {
    attemptId: result.attemptId,
    amountPoisha,
    fundCode,
    visibility,
    publicDisplayName: publicFields.publicDisplayName,
    status: result.status,
    createdAt: new Date().toISOString(),
    disclaimerBn: DEMO_DONATION_DISCLAIMER.demoBn,
    disclaimerEn: DEMO_DONATION_DISCLAIMER.demoEn,
  };

  // Contact fields are intentionally omitted from the response body for public clients
  return NextResponse.json({
    ok: true,
    provider: result.provider,
    status: result.status,
    messageBn: result.messageBn,
    messageEn: result.messageEn,
    receipt,
  });
}
