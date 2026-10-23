"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AppAuthError,
  toSafeAuthError,
  authMessage,
} from "@/lib/auth/errors";
import {
  assertCanAssignRoles,
  requireMosqueAdmin,
  requireRecentAuth,
  requireUser,
} from "@/lib/auth/authorize";
import type { MosqueRole } from "@/lib/auth/types";
import { isMosqueRole } from "@/lib/auth/types";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; message: string };

function fail(err: unknown, locale: "bn" | "en" = "bn"): ActionResult {
  const e = toSafeAuthError(err);
  return { ok: false, code: e.code, message: e.messageFor(locale) };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// Sign-in / sign-out / recovery
// ---------------------------------------------------------------------------

export async function signInWithPassword(input: {
  email: string;
  password: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    if (!input.email?.trim() || !input.password) {
      throw new AppAuthError("validation", 400);
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName?: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    if (!input.email?.trim() || !input.password || input.password.length < 8) {
      throw new AppAuthError("validation", 400);
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { full_name: input.fullName ?? "" },
      },
    });
    if (error) throw error;
    return {
      ok: true,
      message:
        locale === "bn"
          ? "অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল নিশ্চিত করুন।"
          : "Account created. Please confirm your email.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordRecovery(input: {
  email: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    if (!input.email?.trim()) throw new AppAuthError("validation", 400);
    const supabase = await createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(
      input.email.trim(),
      { redirectTo: `${origin}/reset-password` }
    );
    if (error) throw error;
    // Always return success message to avoid email enumeration
    return {
      ok: true,
      message:
        locale === "bn"
          ? "যদি অ্যাকাউন্ট থাকে, পুনরুদ্ধার লিংক পাঠানো হয়েছে।"
          : "If an account exists, a recovery link has been sent.",
    };
  } catch (e) {
    // Still avoid enumeration
    return {
      ok: true,
      message: authMessage("recovery_failed", locale).includes("পুনরুদ্ধার")
        ? "যদি অ্যাকাউন্ট থাকে, পুনরুদ্ধার লিংক পাঠানো হয়েছে।"
        : "If an account exists, a recovery link has been sent.",
    };
  }
}

export async function updatePassword(input: {
  password: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    if (!input.password || input.password.length < 8) {
      throw new AppAuthError("validation", 400);
    }
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error) throw error;
    return {
      ok: true,
      message:
        locale === "bn" ? "পাসওয়ার্ড আপডেট হয়েছে।" : "Password updated.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}

// ---------------------------------------------------------------------------
// Membership invitation workflow
// ---------------------------------------------------------------------------

export async function inviteMember(input: {
  mosqueId: string;
  email?: string;
  phone?: string;
  roles: MosqueRole[];
  /** Password for re-authentication when granting admin */
  reauthPassword?: string;
  locale?: "bn" | "en";
}): Promise<ActionResult & { inviteToken?: string }> {
  const locale = input.locale ?? "bn";
  try {
    if (!input.email && !input.phone) {
      throw new AppAuthError("validation", 400);
    }
    for (const r of input.roles) {
      if (!isMosqueRole(r)) throw new AppAuthError("validation", 400);
    }

    const ctx = await requireMosqueAdmin(input.mosqueId);
    assertCanAssignRoles(ctx, input.roles);

    // Granting admin requires re-authentication
    if (input.roles.includes("admin")) {
      if (!input.reauthPassword) {
        throw new AppAuthError("reauth_required", 401);
      }
      await requireRecentAuth(input.reauthPassword);
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();
    const { error } = await supabase.from("mosque_invitations").insert({
      mosque_id: input.mosqueId,
      email: input.email?.trim().toLowerCase() ?? null,
      phone: input.phone?.trim() ?? null,
      roles: input.roles,
      token_hash: tokenHash,
      invited_by: ctx.user.id,
      status: "pending",
      expires_at: expiresAt,
    });

    if (error) throw error;

    // Audit is also covered for membership; log invite explicitly
    await supabase.from("audit_logs").insert({
      mosque_id: input.mosqueId,
      actor_user_id: ctx.user.id,
      action: "invitation.created",
      entity_type: "mosque_invitations",
      entity_id: null,
      new_values: {
        email: input.email ?? null,
        phone: input.phone ?? null,
        roles: input.roles,
      },
    });

    // Token returned only to the inviter over this server action response —
    // in production send via email/SMS instead of returning to client.
    return {
      ok: true,
      message:
        locale === "bn" ? "আমন্ত্রণ তৈরি হয়েছে।" : "Invitation created.",
      inviteToken: token,
    };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function acceptInvitation(input: {
  token: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    const user = await requireUser();
    if (!input.token) throw new AppAuthError("invite_invalid", 400);

    const tokenHash = hashToken(input.token);
    // Use admin client to read by hash (invitee may not match email policy yet)
    const admin = createAdminClient();
    const { data: invite, error } = await admin
      .from("mosque_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !invite) throw new AppAuthError("invite_invalid", 400);
    if (invite.status === "accepted") throw new AppAuthError("invite_accepted", 400);
    if (invite.status === "revoked") throw new AppAuthError("invite_invalid", 400);
    if (new Date(invite.expires_at) < new Date()) {
      throw new AppAuthError("invite_expired", 400);
    }

    // Create or reactivate membership
    const { data: existing } = await admin
      .from("mosque_memberships")
      .select("id, status")
      .eq("mosque_id", invite.mosque_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("mosque_memberships")
        .update({
          roles: invite.roles,
          status: "active",
          accepted_at: new Date().toISOString(),
          revoked_at: null,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("mosque_memberships").insert({
        mosque_id: invite.mosque_id,
        user_id: user.id,
        roles: invite.roles,
        status: "active",
        accepted_at: new Date().toISOString(),
      });
    }

    await admin
      .from("mosque_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invite.id);

    return {
      ok: true,
      message:
        locale === "bn"
          ? "আমন্ত্রণ গ্রহণ করা হয়েছে।"
          : "Invitation accepted.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function updateMembershipRoles(input: {
  mosqueId: string;
  membershipId: string;
  roles: MosqueRole[];
  reauthPassword?: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    for (const r of input.roles) {
      if (!isMosqueRole(r)) throw new AppAuthError("validation", 400);
    }
    const ctx = await requireMosqueAdmin(input.mosqueId);
    assertCanAssignRoles(ctx, input.roles);

    if (input.roles.includes("admin")) {
      if (!input.reauthPassword) throw new AppAuthError("reauth_required", 401);
      await requireRecentAuth(input.reauthPassword);
    }

    // Prevent removing last admin is app-level; DB still audits
    const supabase = await createClient();
    const { error } = await supabase
      .from("mosque_memberships")
      .update({ roles: input.roles })
      .eq("id", input.membershipId)
      .eq("mosque_id", input.mosqueId);

    if (error) throw error;
    return {
      ok: true,
      message: locale === "bn" ? "ভূমিকা আপডেট হয়েছে।" : "Roles updated.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function suspendMembership(input: {
  mosqueId: string;
  membershipId: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    const ctx = await requireMosqueAdmin(input.mosqueId);
    // Cannot suspend self
    const supabase = await createClient();
    const { data: target } = await supabase
      .from("mosque_memberships")
      .select("user_id")
      .eq("id", input.membershipId)
      .eq("mosque_id", input.mosqueId)
      .maybeSingle();

    if (!target) throw new AppAuthError("forbidden", 403);
    if (target.user_id === ctx.user.id) {
      throw new AppAuthError("forbidden", 403);
    }

    const { error } = await supabase
      .from("mosque_memberships")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", input.membershipId)
      .eq("mosque_id", input.mosqueId);

    if (error) throw error;
    return {
      ok: true,
      message:
        locale === "bn" ? "সদস্যপদ স্থগিত/বাতিল হয়েছে।" : "Membership revoked.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}

export async function revokeInvitation(input: {
  mosqueId: string;
  invitationId: string;
  locale?: "bn" | "en";
}): Promise<ActionResult> {
  const locale = input.locale ?? "bn";
  try {
    await requireMosqueAdmin(input.mosqueId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("mosque_invitations")
      .update({ status: "revoked" })
      .eq("id", input.invitationId)
      .eq("mosque_id", input.mosqueId);
    if (error) throw error;
    return {
      ok: true,
      message: locale === "bn" ? "আমন্ত্রণ বাতিল হয়েছে।" : "Invitation revoked.",
    };
  } catch (e) {
    return fail(e, locale);
  }
}
