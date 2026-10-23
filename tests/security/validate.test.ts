import { describe, it, expect } from "vitest";
import {
  assertSafeStoragePath,
  isUuid,
  requirePoisha,
  ValidationError,
} from "@/lib/security/validate";
import { rateLimit, _resetRateLimitForTests } from "@/lib/security/rate-limit";

describe("validation", () => {
  it("accepts valid uuid", () => {
    expect(isUuid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("enforces mosque-scoped storage paths", () => {
    const mid = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    expect(() => assertSafeStoragePath(mid, `${mid}/docs/a.pdf`)).not.toThrow();
    expect(() => assertSafeStoragePath(mid, "other/docs/a.pdf")).toThrow(
      ValidationError
    );
    expect(() => assertSafeStoragePath(mid, `${mid}/../etc/passwd`)).toThrow(
      ValidationError
    );
  });

  it("rejects non-integer money", () => {
    expect(() => requirePoisha(10.5)).toThrow(ValidationError);
    expect(() => requirePoisha(-1)).toThrow(ValidationError);
    expect(requirePoisha(100)).toBe(100);
  });
});

describe("rate limit", () => {
  it("blocks after limit within window", () => {
    _resetRateLimitForTests();
    const key = "test-key";
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const third = rateLimit({ key, limit: 2, windowMs: 60_000 });
    expect(third.ok).toBe(false);
  });
});
