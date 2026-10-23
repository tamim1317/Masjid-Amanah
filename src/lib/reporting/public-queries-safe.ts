/**
 * Pure helpers for public reporting (no server-only import) — used by unit tests.
 */

/** Redact helper for any accidental private fields */
export function sanitizePublicPayload<T extends Record<string, unknown>>(
  row: T
): T {
  const blocked = [
    "phone",
    "email",
    "password",
    "token",
    "storage_path",
    "decision_comment",
    "rejection_reason",
    "memo",
    "internal",
  ];
  const out = { ...row };
  for (const key of Object.keys(out)) {
    if (blocked.some((b) => key.toLowerCase().includes(b))) {
      delete out[key];
    }
  }
  return out;
}
