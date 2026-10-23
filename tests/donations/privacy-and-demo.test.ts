import { describe, it, expect } from "vitest";
import {
  DemoPaymentProvider,
  toPublicDonationFields,
} from "@/lib/donations/provider";

describe("donation privacy", () => {
  it("anonymous public display clears name", () => {
    const f = toPublicDonationFields({
      visibility: "anonymous_public",
      displayName: "Rahim",
      contactEmail: "a@b.com",
      contactPhone: "01700000000",
    });
    expect(f.publicDisplayName).toBeNull();
  });

  it("public_name keeps display name", () => {
    const f = toPublicDonationFields({
      visibility: "public_name",
      displayName: "Rahim",
    });
    expect(f.publicDisplayName).toBe("Rahim");
  });
});

describe("demo payment provider", () => {
  it("never returns paid_verified", async () => {
    const p = new DemoPaymentProvider();
    const r = await p.initiate({
      mosqueSlug: "demo",
      amountPoisha: 50000,
      fundCode: "GENERAL",
      visibility: "anonymous_public",
    });
    expect(r.status).toBe("demo_not_processed");
    expect(r.status).not.toBe("paid_verified");
    expect(r.messageEn.toLowerCase()).toContain("not processed");
  });
});
