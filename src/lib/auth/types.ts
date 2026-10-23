export type MosqueRole =
  | "admin"
  | "treasurer"
  | "approver"
  | "committee"
  | "staff"
  | "viewer";

export type MembershipStatus = "invited" | "active" | "revoked";

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  locale: "bn" | "en";
  is_platform_admin: boolean;
}

export interface MosqueMembership {
  id: string;
  mosque_id: string;
  user_id: string;
  roles: MosqueRole[];
  status: MembershipStatus;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface SessionUser {
  id: string;
  email: string | null;
  phone: string | null;
  profile: Profile | null;
}

export interface AuthContext {
  user: SessionUser;
  /** Active membership for the current mosque context, if any */
  membership: MosqueMembership | null;
  isPlatformAdmin: boolean;
}

/** Mosque roles only — never includes platform admin */
export const MOSQUE_ROLES: readonly MosqueRole[] = [
  "admin",
  "treasurer",
  "approver",
  "committee",
  "staff",
  "viewer",
] as const;

export function isMosqueRole(value: string): value is MosqueRole {
  return (MOSQUE_ROLES as readonly string[]).includes(value);
}

export function hasAnyRole(
  membership: MosqueMembership | null | undefined,
  roles: MosqueRole[]
): boolean {
  if (!membership || membership.status !== "active") return false;
  return roles.some((r) => membership.roles.includes(r));
}
