/**
 * Integration-style unit tests for authorization helpers.
 * These do not require a live Supabase instance.
 *
 * Run: npx vitest run tests/auth
 */

import { describe, it, expect } from "vitest";
import {
  assertCanAssignRoles,
} from "@/lib/auth/authorize-pure";
import {
  AppAuthError,
  authMessage,
  toSafeAuthError,
} from "@/lib/auth/errors";
import { hasAnyRole, isMosqueRole, type AuthContext } from "@/lib/auth/types";

function ctx(partial: Partial<AuthContext> & { isPlatformAdmin: boolean }): AuthContext {
  return {
    user: {
      id: "u1",
      email: "a@test.local",
      phone: null,
      profile: {
        id: "u1",
        email: "a@test.local",
        phone: null,
        full_name: "A",
        locale: "bn",
        is_platform_admin: partial.isPlatformAdmin,
      },
    },
    membership: partial.membership ?? null,
    isPlatformAdmin: partial.isPlatformAdmin,
  };
}

describe("role helpers", () => {
  it("rejects unknown mosque roles", () => {
    expect(isMosqueRole("admin")).toBe(true);
    expect(isMosqueRole("platform_admin")).toBe(false);
    expect(isMosqueRole("superuser")).toBe(false);
  });

  it("hasAnyRole requires active membership", () => {
    expect(
      hasAnyRole(
        {
          id: "m1",
          mosque_id: "a",
          user_id: "u1",
          roles: ["treasurer"],
          status: "revoked",
          invited_at: "",
          accepted_at: null,
          revoked_at: null,
        },
        ["treasurer"]
      )
    ).toBe(false);

    expect(
      hasAnyRole(
        {
          id: "m1",
          mosque_id: "a",
          user_id: "u1",
          roles: ["treasurer"],
          status: "active",
          invited_at: "",
          accepted_at: null,
          revoked_at: null,
        },
        ["admin", "treasurer"]
      )
    ).toBe(true);
  });
});

describe("assertCanAssignRoles — escalation prevention", () => {
  it("allows platform admin any mosque roles", () => {
    expect(() =>
      assertCanAssignRoles(ctx({ isPlatformAdmin: true }), ["admin", "treasurer"])
    ).not.toThrow();
  });

  it("allows mosque admin to assign roles", () => {
    expect(() =>
      assertCanAssignRoles(
        ctx({
          isPlatformAdmin: false,
          membership: {
            id: "m1",
            mosque_id: "a",
            user_id: "u1",
            roles: ["admin"],
            status: "active",
            invited_at: "",
            accepted_at: null,
            revoked_at: null,
          },
        }),
        ["treasurer", "viewer"]
      )
    ).not.toThrow();
  });

  it("denies treasurer assigning roles", () => {
    expect(() =>
      assertCanAssignRoles(
        ctx({
          isPlatformAdmin: false,
          membership: {
            id: "m1",
            mosque_id: "a",
            user_id: "u1",
            roles: ["treasurer"],
            status: "active",
            invited_at: "",
            accepted_at: null,
            revoked_at: null,
          },
        }),
        ["admin"]
      )
    ).toThrow(AppAuthError);
  });

  it("denies revoked membership from assigning", () => {
    expect(() =>
      assertCanAssignRoles(
        ctx({
          isPlatformAdmin: false,
          membership: {
            id: "m1",
            mosque_id: "a",
            user_id: "u1",
            roles: ["admin"],
            status: "revoked",
            invited_at: "",
            accepted_at: null,
            revoked_at: null,
          },
        }),
        ["viewer"]
      )
    ).toThrow(AppAuthError);
  });
});

describe("safe error messages", () => {
  it("returns Bangla by default without leaking internals", () => {
    const msg = authMessage("escalation_denied", "bn");
    expect(msg).toContain("ভূমিকা");
    expect(msg.toLowerCase()).not.toContain("sql");
    expect(msg.toLowerCase()).not.toContain("service_role");
  });

  it("maps internal elevation errors to escalation_denied", () => {
    const e = toSafeAuthError(new Error("platform_admin_elevation_denied"));
    expect(e.code).toBe("escalation_denied");
    expect(e.messageFor("bn")).not.toMatch(/postgres|stack|at Object/i);
  });

  it("maps invalid login to invalid_credentials", () => {
    const e = toSafeAuthError(new Error("Invalid login credentials"));
    expect(e.code).toBe("invalid_credentials");
    expect(e.status).toBe(401);
  });
});
