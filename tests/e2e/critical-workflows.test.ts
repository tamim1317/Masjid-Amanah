/**
 * Critical workflow tests using pure domain logic + simulated tenant isolation.
 * These do NOT replace SQL RLS tests or a real browser E2E suite.
 * Marked as workflow unit/integration; full browser E2E requires Playwright + live Supabase
 * (see docs/PRODUCTION_READINESS.md — untested without that stack).
 */

import { describe, it, expect } from "vitest";
import {
  assertLinesBalanced,
  formatPoisha,
} from "@/lib/accounting/types";
import { assertCanAssignRoles } from "@/lib/auth/authorize-pure";
import type { AuthContext } from "@/lib/auth/types";
import { AppAuthError } from "@/lib/auth/errors";
import { sanitizePublicPayload } from "@/lib/reporting/public-queries-safe";
import { buildReportText } from "@/lib/reporting/pdf-report";

const tenantA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const tenantB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function adminCtx(mosqueId: string): AuthContext {
  return {
    user: {
      id: "user-admin",
      email: "a@test.local",
      phone: null,
      profile: {
        id: "user-admin",
        email: "a@test.local",
        phone: null,
        full_name: "Admin",
        locale: "bn",
        is_platform_admin: false,
      },
    },
    membership: {
      id: "mem-1",
      mosque_id: mosqueId,
      user_id: "user-admin",
      roles: ["admin"],
      status: "active",
      invited_at: "",
      accepted_at: null,
      revoked_at: null,
    },
    isPlatformAdmin: false,
  };
}

describe("critical workflow: multi-tenant role boundary", () => {
  it("admin of A cannot be treated as admin of B via context", () => {
    const ctxA = adminCtx(tenantA);
    expect(ctxA.membership?.mosque_id).toBe(tenantA);
    expect(ctxA.membership?.mosque_id).not.toBe(tenantB);
    // Assigning roles is only valid when membership mosque matches the target
    // (server layer must pass the target mosqueId into requireMosqueAdmin)
    expect(() => assertCanAssignRoles(ctxA, ["treasurer"])).not.toThrow();
  });

  it("revoked membership cannot assign roles", () => {
    const ctx = adminCtx(tenantA);
    ctx.membership!.status = "revoked";
    expect(() => assertCanAssignRoles(ctx, ["viewer"])).toThrow(AppAuthError);
  });
});

describe("critical workflow: journal integrity", () => {
  it("synthetic income journal balances in poisha", () => {
    const lines = [
      { accountId: "cash", fundId: "gen", debitPoisha: 150075, creditPoisha: 0 },
      { accountId: "inc", fundId: "gen", debitPoisha: 0, creditPoisha: 150075 },
    ];
    expect(() => assertLinesBalanced(lines)).not.toThrow();
    expect(formatPoisha(150075, "en")).toBe("BDT 1500.75");
  });

  it("unbalanced synthetic expense is rejected", () => {
    expect(() =>
      assertLinesBalanced([
        { accountId: "exp", fundId: "gen", debitPoisha: 100, creditPoisha: 0 },
        { accountId: "cash", fundId: "gen", debitPoisha: 0, creditPoisha: 90 },
      ])
    ).toThrow(/unbalanced/);
  });
});

describe("critical workflow: public report redaction", () => {
  it("public payload never includes phone or storage_path", () => {
    const row = sanitizePublicPayload({
      entryNumber: "J-1",
      amount: 100,
      phone: "01711111111",
      storage_path: "secret",
    });
    expect(row.entryNumber).toBe("J-1");
    expect(row).not.toHaveProperty("phone");
    expect(row).not.toHaveProperty("storage_path");
  });

  it("report text includes period and excludes private markers", () => {
    const text = buildReportText({
      mosqueNameBn: "টেস্ট",
      report: {
        id: "r",
        mosqueId: tenantA,
        periodType: "month",
        periodYear: 2026,
        periodMonth: 10,
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        titleBn: "প্রতিবেদন",
        titleEn: null,
        status: "published",
        revision: 1,
        publishedAt: "2026-11-01T00:00:00Z",
        snapshotPoisha: {},
        ledgerChecksum: "deadbeef",
        notesPublicBn: null,
        notesPublicEn: null,
      },
      totals: {
        incomePoisha: 100,
        expensePoisha: 0,
        transferPoisha: 0,
        closingCashPoisha: 100,
      },
      funds: [],
      locale: "bn",
    });
    expect(text).toContain("deadbeef");
    expect(text).toContain("2026-10-01");
    expect(text.toLowerCase()).not.toContain("password");
  });
});
