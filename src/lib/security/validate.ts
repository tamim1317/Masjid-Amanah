/**
 * Shared input validation (no trust of client shapes).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function requireUuid(value: unknown, field = "id"): string {
  if (!isUuid(value)) {
    throw new ValidationError(`${field} অবৈধ`);
  }
  return value;
}

export function requireNonEmptyString(
  value: unknown,
  field: string,
  maxLen = 500
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} প্রয়োজন`);
  }
  const t = value.trim();
  if (t.length > maxLen) {
    throw new ValidationError(`${field} খুব বড়`);
  }
  return t;
}

/** Storage path must be mosque-scoped: `{mosqueId}/...` */
export function assertSafeStoragePath(
  mosqueId: string,
  storagePath: string
): void {
  if (!storagePath.startsWith(`${mosqueId}/`)) {
    throw new ValidationError("ফাইল পথ মসজিদ স্কোপড নয়");
  }
  if (storagePath.includes("..") || storagePath.includes("\\")) {
    throw new ValidationError("ফাইল পথ অবৈধ");
  }
  if (storagePath.length > 512) {
    throw new ValidationError("ফাইল পথ খুব বড়");
  }
}

export function requirePoisha(value: unknown, field = "amount"): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} অবৈধ (পয়সায় পূর্ণসংখ্যা)`);
  }
  return value;
}

export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
