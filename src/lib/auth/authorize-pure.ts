/**
 * Pure authorization helpers (no server-only imports) for unit tests.
 * Production server code uses authorize.ts which re-exports behavior via actions.
 */

import { AppAuthError } from "@/lib/auth/errors";
import type { AuthContext, MosqueRole } from "@/lib/auth/types";

export function assertCanAssignRoles(
  actor: AuthContext,
  proposedRoles: MosqueRole[]
): void {
  if (actor.isPlatformAdmin) return;

  if (!actor.membership || actor.membership.status !== "active") {
    throw new AppAuthError("forbidden", 403);
  }

  if (!actor.membership.roles.includes("admin")) {
    throw new AppAuthError("escalation_denied", 403);
  }

  for (const r of proposedRoles) {
    if (
      !["admin", "treasurer", "approver", "committee", "staff", "viewer"].includes(
        r
      )
    ) {
      throw new AppAuthError("validation", 400);
    }
  }
}
