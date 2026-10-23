import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AppAuthError } from "@/lib/auth/errors";
import type {
  AuthContext,
  MosqueMembership,
  MosqueRole,
  Profile,
  SessionUser,
} from "@/lib/auth/types";
import { hasAnyRole } from "@/lib/auth/types";

/**
 * Load the current session user + profile. Throws if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  if (!isSupabaseConfigured()) {
    throw new AppAuthError("unauthenticated", 401);
  }
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppAuthError("unauthenticated", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, phone, full_name, locale, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

/**
 * Optional session (null if anonymous).
 */
export async function getOptionalUser(): Promise<SessionUser | null> {
  try {
    return await requireUser();
  } catch (e) {
    if (e instanceof AppAuthError && e.code === "unauthenticated") {
      return null;
    }
    throw e;
  }
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.profile?.is_platform_admin) {
    throw new AppAuthError("platform_required", 403);
  }
  return user;
}

/**
 * Require active membership in a mosque. Optionally require specific roles.
 */
export async function requireMosqueAccess(
  mosqueId: string,
  roles?: MosqueRole[]
): Promise<AuthContext> {
  const user = await requireUser();
  const isPlatformAdmin = Boolean(user.profile?.is_platform_admin);

  if (isPlatformAdmin) {
    return { user, membership: null, isPlatformAdmin: true };
  }

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("mosque_memberships")
    .select(
      "id, mosque_id, user_id, roles, status, invited_at, accepted_at, revoked_at"
    )
    .eq("mosque_id", mosqueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    throw new AppAuthError("forbidden", 403);
  }

  const m = membership as MosqueMembership;

  if (m.status === "revoked") {
    throw new AppAuthError("membership_revoked", 403);
  }
  if (m.status !== "active") {
    throw new AppAuthError("membership_inactive", 403);
  }

  if (roles && roles.length > 0 && !hasAnyRole(m, roles)) {
    throw new AppAuthError("role_required", 403);
  }

  return { user, membership: m, isPlatformAdmin: false };
}

/** Accounting mutations: admin or treasurer */
export async function requireAccountingAccess(mosqueId: string) {
  return requireMosqueAccess(mosqueId, ["admin", "treasurer"]);
}

/** Approvals: admin or approver */
export async function requireApproverAccess(mosqueId: string) {
  return requireMosqueAccess(mosqueId, ["admin", "approver"]);
}

/** Mosque admin only */
export async function requireMosqueAdmin(mosqueId: string) {
  return requireMosqueAccess(mosqueId, ["admin"]);
}

/**
 * Re-authentication check for sensitive actions.
 * Caller must pass a password (or recent AAL2) verified via Supabase.
 */
export async function requireRecentAuth(password: string): Promise<void> {
  const user = await requireUser();
  if (!user.email && !user.phone) {
    throw new AppAuthError("reauth_required", 401);
  }

  const supabase = await createClient();
  const identifier = user.email ?? user.phone!;
  const { error } = await supabase.auth.signInWithPassword(
    user.email
      ? { email: identifier, password }
      : { phone: identifier, password }
  );

  if (error) {
    throw new AppAuthError("reauth_required", 401);
  }
}

export { assertCanAssignRoles } from "@/lib/auth/authorize-pure";
