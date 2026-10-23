/** Digital donation types — UI/demo phase. Money amounts in integer poisha. */

export type DonationVisibility = "public_name" | "anonymous_public";

export type DonationFundCode =
  | "GENERAL"
  | "CONSTRUCTION"
  | "ZAKAT"
  | "OTHER";

export interface DonationFundOption {
  code: DonationFundCode;
  nameBn: string;
  nameEn: string;
  /** Zakat only when mosque configures eligibility */
  enabled: boolean;
  requiresEligibilityNote?: boolean;
  noteBn?: string;
  noteEn?: string;
}

export interface DonationIntentInput {
  mosqueSlug: string;
  amountPoisha: number;
  fundCode: DonationFundCode;
  visibility: DonationVisibility;
  /** Required only when visibility is public_name */
  displayName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export type PaymentProviderId = "demo" | "sslcommerz" | "bkash" | "nagad";

/** Status values — never invent "paid" from the frontend alone */
export type PaymentAttemptStatus =
  | "demo_not_processed"
  | "created"
  | "redirected"
  | "pending_verification"
  | "paid_verified"
  | "failed"
  | "cancelled";

export interface PaymentInitResult {
  provider: PaymentProviderId;
  status: PaymentAttemptStatus;
  /** Opaque reference for later reconciliation — not a public receipt of payment */
  attemptId: string;
  messageBn: string;
  messageEn: string;
  /** Never a live gateway URL in demo */
  redirectUrl?: string;
}

export interface DonationReceiptPreview {
  attemptId: string;
  amountPoisha: number;
  fundCode: DonationFundCode;
  visibility: DonationVisibility;
  /** Null when anonymous to public */
  publicDisplayName: string | null;
  status: PaymentAttemptStatus;
  createdAt: string;
  disclaimerBn: string;
  disclaimerEn: string;
}

/** Public list item — never includes phone, email, or payment refs for anonymous */
export interface PublicDonationListItem {
  id: string;
  amountPoisha: number;
  fundCode: DonationFundCode;
  publicDisplayName: string | null;
  isAnonymous: boolean;
  publishedAt: string;
}
