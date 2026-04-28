import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "admin" | "employee" | "saas_owner";

export async function getSessionProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id, is_blocked")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.is_blocked) {
    return null;
  }

  return { user, profile };
}

export async function requireAuth() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}

export function canManage(role: AppRole) {
  return role === "owner" || role === "admin" || role === "saas_owner";
}

export function isSaasOwner(role: AppRole) {
  return role === "saas_owner";
}
