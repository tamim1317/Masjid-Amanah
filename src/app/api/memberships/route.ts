import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { isUuid } from "@/lib/security/validate";
import {
  requireMosqueAdmin,
  assertCanAssignRoles,
} from "@/lib/auth/authorize";
import { AppAuthError, toSafeAuthError } from "@/lib/auth/errors";
import { isMosqueRole, type MosqueRole } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/memberships — update roles (server-side auth required).
 * Body: { mosqueId, membershipId, roles: MosqueRole[] }
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit({ key: `memberships:post:${ip}`, limit: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, code: "rate_limited", message: "অনেকবার চেষ্টা হয়েছে।" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    const body = await request.json();
    const mosqueId = String(body.mosqueId ?? "");
    const membershipId = String(body.membershipId ?? "");
    if (!isUuid(mosqueId) || !isUuid(membershipId)) {
      throw new AppAuthError("validation", 400);
    }
    const roles = (body.roles ?? []) as string[];

    if (!mosqueId || !membershipId || !Array.isArray(roles)) {
      throw new AppAuthError("validation", 400);
    }
    for (const r of roles) {
      if (!isMosqueRole(r)) throw new AppAuthError("validation", 400);
    }

    const ctx = await requireMosqueAdmin(mosqueId);
    assertCanAssignRoles(ctx, roles as MosqueRole[]);

    const supabase = await createClient();
    const { error } = await supabase
      .from("mosque_memberships")
      .update({ roles })
      .eq("id", membershipId)
      .eq("mosque_id", mosqueId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = toSafeAuthError(e);
    return NextResponse.json(
      { ok: false, code: err.code, message: err.messageFor("bn") },
      { status: err.status }
    );
  }
}

/**
 * GET without auth must 401 — used by integration tests.
 */
export async function GET() {
  try {
    const { requireUser } = await import("@/lib/auth/authorize");
    await requireUser();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = toSafeAuthError(e);
    return NextResponse.json(
      { ok: false, code: err.code, message: err.messageFor("bn") },
      { status: err.status }
    );
  }
}
