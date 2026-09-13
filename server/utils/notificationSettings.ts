import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import type { H3Event } from "h3";

export const notificationSettingsSchema = z.object({
  recipientEmails: z.array(z.string().email().max(254)).min(1).max(10),
});

export async function getNotificationSettings(event: H3Event) {
  const client = await serverSupabaseClient(event);
  const { data, error } = await client
    .from("notification_settings")
    .select("recipient_emails")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data.recipient_emails;
}

export async function updateNotificationSettings(event: H3Event, recipientEmails: string[]) {
  const client = await serverSupabaseClient(event);
  const { data, error } = await client
    .from("notification_settings")
    .update({
      recipient_emails: recipientEmails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("recipient_emails")
    .single();
  if (error) throw error;
  return data.recipient_emails;
}
