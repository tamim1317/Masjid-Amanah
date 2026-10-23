import { describe, it, expect } from "vitest";
import {
  assertLinesBalanced,
  formatPoisha,
  assertNonNegativeInteger,
} from "@/lib/accounting/types";

describe("money integrity (no floating point)", () => {
  it("accepts balanced integer lines", () => {
    expect(() =>
      assertLinesBalanced([
        { accountId: "a", fundId: "f", debitPoisha: 10050, creditPoisha: 0 },
        { accountId: "b", fundId: "f", debitPoisha: 0, creditPoisha: 10050 },
      ])
    ).not.toThrow();
  });

  it("rejects unbalanced lines", () => {
    expect(() =>
      assertLinesBalanced([
        { accountId: "a", fundId: "f", debitPoisha: 100, creditPoisha: 0 },
        { accountId: "b", fundId: "f", debitPoisha: 0, creditPoisha: 99 },
      ])
    ).toThrow(/unbalanced/);
  });

  it("rejects float-like non-integers", () => {
    expect(() => assertNonNegativeInteger(10.5, "x")).toThrow();
    expect(() => assertNonNegativeInteger(-1, "x")).toThrow();
  });

  it("rejects single-line journal", () => {
    expect(() =>
      assertLinesBalanced([
        { accountId: "a", fundId: "f", debitPoisha: 100, creditPoisha: 0 },
      ])
    ).toThrow(/two lines/);
  });

  it("formats poisha without float drift", () => {
    expect(formatPoisha(10050, "en")).toBe("BDT 100.50");
    expect(formatPoisha(1, "en")).toBe("BDT 0.01");
    expect(formatPoisha(0, "bn")).toBe("৳0.00");
  });
});
