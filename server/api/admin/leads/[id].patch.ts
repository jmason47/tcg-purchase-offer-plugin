import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import { requireAdmin } from "../../../utils/admin";
import { sendRejectionNotification } from "../../../utils/email";
import { reviewDecision, reviewUpdateSchema } from "../../../utils/review";

const idSchema = z.string().uuid();

export default defineEventHandler(async event => {
  const user = await requireAdmin(event);
  const id = idSchema.safeParse(getRouterParam(event, "id"));
  const body = reviewUpdateSchema.safeParse(await readBody(event));
  if (!id.success || !body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid status update" });
  }

  const client = await serverSupabaseClient(event);
  const { data: current, error: readError } = await client
    .from("offer_leads")
    .select("id, status, contact_email")
    .eq("id", id.data)
    .maybeSingle();
  if (readError) {
    console.error(readError);
    throw createError({ statusCode: 502, statusMessage: "Unable to load sale" });
  }
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });
  }
  const decision = reviewDecision(current.status, body.data.status);
  if (decision === "conflict") {
    throw createError({ statusCode: 409, statusMessage: "This sale has already been reviewed" });
  }
  if (decision === "unchanged") {
    return { status: current.status, unchanged: true };
  }

  const { error: updateError } = await client
    .from("offer_leads")
    .update({
      status: body.data.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.sub,
      internal_note: body.data.internalNote || null,
    })
    .eq("id", id.data)
    .eq("status", "pending");
  if (updateError) {
    console.error(updateError);
    throw createError({ statusCode: 502, statusMessage: "Unable to update sale" });
  }
  if (body.data.status === "rejected") {
    try {
      await sendRejectionNotification(current.contact_email);
    } catch (notificationError) {
      console.error("Unable to send rejection notification", notificationError);
    }
  }
  return { status: body.data.status, unchanged: false };
});
