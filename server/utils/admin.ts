import type { H3Event } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event);
  if (!user?.sub) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }

  const client = await serverSupabaseClient(event);
  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (error || !data) {
    throw createError({ statusCode: 403, statusMessage: "Admin access required" });
  }
  return user;
}
