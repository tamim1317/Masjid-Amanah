import { getMobileConfig } from "./env";
import { getSupabase } from "./supabase";

/**
 * Thin API helpers. Financial mutations must go through Postgres RPCs
 * (post_journal, submit_journal, …) so the accounting engine stays server-side.
 */

export async function fetchSessionUser() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Example: list memberships for current user (RLS applies). */
export async function listMyMemberships() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mosque_memberships")
    .select("id, mosque_id, roles, status")
    .eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

/**
 * Submit journal via RPC — business rules enforced in Postgres.
 * Mobile only passes ids and actor is derived from JWT on the server.
 */
export async function rpcSubmitJournal(transactionId: string) {
  const supabase = getSupabase();
  const user = await fetchSessionUser();
  if (!user) throw new Error("unauthenticated");
  const { data, error } = await supabase.rpc("submit_journal", {
    p_tx_id: transactionId,
    p_actor: user.id,
  });
  if (error) throw error;
  return data;
}

/** Optional BFF call (never sends service role). */
export async function bffHealth() {
  const { apiBaseUrl } = getMobileConfig();
  if (!apiBaseUrl) return { ok: false as const, reason: "no_api_base" };
  const res = await fetch(`${apiBaseUrl}/`);
  return { ok: res.ok, status: res.status };
}
