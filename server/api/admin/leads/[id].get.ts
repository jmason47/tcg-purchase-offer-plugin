import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import { requireAdmin } from "../../../utils/admin";

const idSchema = z.string().uuid();

export default defineEventHandler(async event => {
  await requireAdmin(event);
  const id = idSchema.safeParse(getRouterParam(event, "id"));
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid lead ID" });
  }

  const client = await serverSupabaseClient(event);
  const { data, error } = await client
    .from("offer_leads")
    .select("id, contact_name, contact_email, contact_phone, total_market_price_cents, total_offer_cents, offer_rate, priced_at, created_at, status, reviewed_at, reviewed_by, internal_note, offer_lead_items(id, card_id, card_name, quantity, market_price_cents, offer_price_cents)")
    .eq("id", id.data)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Unable to load sale" });
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });
  }
  return { lead: data };
});
