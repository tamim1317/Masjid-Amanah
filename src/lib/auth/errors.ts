/**
 * User-facing Bangla (and English) auth errors.
 * Never expose stack traces, SQL, or internal keys.
 */

export type AuthErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "membership_revoked"
  | "membership_inactive"
  | "role_required"
  | "platform_required"
  | "escalation_denied"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "recovery_failed"
  | "invite_invalid"
  | "invite_expired"
  | "invite_accepted"
  | "reauth_required"
  | "rate_limited"
  | "validation"
  | "unknown";

const messagesBn: Record<AuthErrorCode, string> = {
  unauthenticated: "আপনি লগ ইন করেননি। অনুগ্রহ করে প্রবেশ করুন।",
  forbidden: "এই কাজটি করার অনুমতি আপনার নেই।",
  membership_revoked: "আপনার সদস্যপদ বাতিল করা হয়েছে।",
  membership_inactive: "আপনার সদস্যপদ সক্রিয় নয়।",
  role_required: "এই কাজের জন্য প্রয়োজনীয় ভূমিকা নেই।",
  platform_required: "প্ল্যাটফর্ম অ্যাডমিন অনুমতি প্রয়োজন।",
  escalation_denied: "উচ্চতর ভূমিকা নিজে থেকে নেওয়া বা দেওয়া যায় না।",
  invalid_credentials: "ইমেইল/ফোন বা পাসওয়ার্ড সঠিক নয়।",
  email_not_confirmed: "ইমেইল এখনও নিশ্চিত করা হয়নি।",
  recovery_failed: "পাসওয়ার্ড পুনরুদ্ধার করা যায়নি। আবার চেষ্টা করুন।",
  invite_invalid: "আমন্ত্রণ লিংকটি অবৈধ।",
  invite_expired: "আমন্ত্রণের মেয়াদ শেষ হয়ে গেছে।",
  invite_accepted: "এই আমন্ত্রণ ইতিমধ্যে গ্রহণ করা হয়েছে।",
  reauth_required: "এই কাজের জন্য আবার প্রবেশ করা প্রয়োজন।",
  rate_limited: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  validation: "প্রদত্ত তথ্য সঠিক নয়।",
  unknown: "কিছু সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।",
};

const messagesEn: Record<AuthErrorCode, string> = {
  unauthenticated: "You are not signed in. Please sign in.",
  forbidden: "You do not have permission to perform this action.",
  membership_revoked: "Your membership has been revoked.",
  membership_inactive: "Your membership is not active.",
  role_required: "You do not have the required role for this action.",
  platform_required: "Platform administrator permission is required.",
  escalation_denied: "Elevated roles cannot be self-assigned or granted this way.",
  invalid_credentials: "Email/phone or password is incorrect.",
  email_not_confirmed: "Email has not been confirmed yet.",
  recovery_failed: "Password recovery failed. Please try again.",
  invite_invalid: "This invitation link is invalid.",
  invite_expired: "This invitation has expired.",
  invite_accepted: "This invitation has already been accepted.",
  reauth_required: "Please sign in again to continue this action.",
  rate_limited: "Too many attempts. Please try again later.",
  validation: "The provided information is invalid.",
  unknown: "Something went wrong. Please try again later.",
};

export class AppAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, status = 403) {
    super(messagesBn[code]);
    this.name = "AppAuthError";
    this.code = code;
    this.status = status;
  }

  messageFor(locale: "bn" | "en" = "bn"): string {
    return locale === "en" ? messagesEn[this.code] : messagesBn[this.code];
  }
}

export function authMessage(
  code: AuthErrorCode,
  locale: "bn" | "en" = "bn"
): string {
  return locale === "en" ? messagesEn[code] : messagesBn[code];
}

/** Map unknown errors to safe user messages (never leak internals). */
export function toSafeAuthError(err: unknown): AppAuthError {
  if (err instanceof AppAuthError) return err;

  const msg = err instanceof Error ? err.message : String(err ?? "");

  if (/invalid login|invalid credentials|email.*password/i.test(msg)) {
    return new AppAuthError("invalid_credentials", 401);
  }
  if (/email not confirmed/i.test(msg)) {
    return new AppAuthError("email_not_confirmed", 403);
  }
  if (/rate limit|too many/i.test(msg)) {
    return new AppAuthError("rate_limited", 429);
  }
  if (/platform_admin_elevation|role_escalation|self_role_change/i.test(msg)) {
    return new AppAuthError("escalation_denied", 403);
  }
  if (/membership_forbidden/i.test(msg)) {
    return new AppAuthError("forbidden", 403);
  }

  return new AppAuthError("unknown", 500);
}
