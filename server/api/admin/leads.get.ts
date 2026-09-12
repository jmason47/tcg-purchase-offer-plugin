import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import { requireAdmin } from "../../utils/admin";

const querySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export default defineEventHandler(async event => {
  await requireAdmin(event);
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid lead list query" });
  }

  const { status, page, pageSize } = query.data;
  const from = (page - 1) * pageSize;
  const client = await serverSupabaseClient(event);
  let request = client
    .from("offer_leads")
    .select("id, contact_name, contact_email, contact_phone, total_offer_cents, status, created_at, reviewed_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (status) request = request.eq("status", status);

  const { data, count, error } = await request;
  if (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Unable to load sales" });
  }
  return { leads: data ?? [], page, pageSize, total: count ?? 0 };
});
