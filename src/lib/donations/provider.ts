import type {
  DonationIntentInput,
  PaymentInitResult,
  PaymentProviderId,
} from "@/lib/donations/types";

/**
 * Payment provider abstraction.
 * Real SSLCommerz / bKash / Nagad adapters must:
 * - run only on the server
 * - use env-based merchant credentials
 * - verify callbacks and query gateway status before marking paid
 * - be idempotent (no duplicate ledger posts)
 *
 * Demo provider never processes money and never returns paid_verified.
 */

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  initiate(input: DonationIntentInput): Promise<PaymentInitResult>;
}

function newAttemptId(): string {
  return `don_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class DemoPaymentProvider implements PaymentProvider {
  readonly id = "demo" as const;

  async initiate(input: DonationIntentInput): Promise<PaymentInitResult> {
    if (!Number.isInteger(input.amountPoisha) || input.amountPoisha <= 0) {
      return {
        provider: "demo",
        status: "failed",
        attemptId: newAttemptId(),
        messageBn: "অবৈধ পরিমাণ।",
        messageEn: "Invalid amount.",
      };
    }

    // Explicitly not paid — UI must show demo banner
    return {
      provider: "demo",
      status: "demo_not_processed",
      attemptId: newAttemptId(),
      messageBn:
        "ডেমো মোড — কোনো পেমেন্ট প্রক্রিয়া হয়নি। আসল পেমেন্ট সংগ্রহ করা হয়নি।",
      messageEn:
        "Demo only — payment not processed. No real payment was collected.",
    };
  }
}

/** Placeholders for future server-side adapters — not callable in demo builds without credentials */
export class UnconfiguredProvider implements PaymentProvider {
  constructor(readonly id: PaymentProviderId) {}

  async initiate(): Promise<PaymentInitResult> {
    return {
      provider: this.id,
      status: "failed",
      attemptId: newAttemptId(),
      messageBn: "পেমেন্ট প্রোভাইডার কনফিগার করা নেই।",
      messageEn: "Payment provider is not configured.",
    };
  }
}

export function getPaymentProvider(
  mode: "demo" | "live" = "demo"
): PaymentProvider {
  if (mode === "demo") {
    return new DemoPaymentProvider();
  }
  // Live selection would read env (e.g. PAYMENT_PROVIDER=sslcommerz) on server only
  const name = (process.env.PAYMENT_PROVIDER ?? "demo") as PaymentProviderId;
  if (name === "demo") return new DemoPaymentProvider();
  return new UnconfiguredProvider(name);
}

/**
 * Public redaction: anonymous donations never expose identity fields.
 */
export function toPublicDonationFields(input: {
  visibility: "public_name" | "anonymous_public";
  displayName?: string;
  contactEmail?: string;
  contactPhone?: string;
}): {
  publicDisplayName: string | null;
  contactEmailStored: string | null;
  contactPhoneStored: string | null;
} {
  if (input.visibility === "anonymous_public") {
    return {
      publicDisplayName: null,
      // Stored for authorized admins in a future backend — not returned to public APIs
      contactEmailStored: input.contactEmail?.trim() || null,
      contactPhoneStored: input.contactPhone?.trim() || null,
    };
  }
  return {
    publicDisplayName: input.displayName?.trim() || null,
    contactEmailStored: input.contactEmail?.trim() || null,
    contactPhoneStored: input.contactPhone?.trim() || null,
  };
}
