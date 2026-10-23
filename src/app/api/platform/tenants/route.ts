import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/authorize";
import { toSafeAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Platform-only tenant list. Mosque admins must receive 403.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mosques")
      .select("id, slug, name_bn, status")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const err = toSafeAuthError(e);
    return NextResponse.json(
      { ok: false, code: err.code, message: err.messageFor("bn") },
      { status: err.status }
    );
  }
}
