import { requireAdmin } from "../../utils/admin";
import {
  notificationSettingsSchema,
  updateNotificationSettings,
} from "../../utils/notificationSettings";

export default defineEventHandler(async event => {
  await requireAdmin(event);
  const body = notificationSettingsSchema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Enter between 1 and 10 valid email addresses" });
  }

  const recipientEmails = [...new Set(body.data.recipientEmails.map(email => email.toLowerCase()))];
  if (recipientEmails.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "At least one recipient is required" });
  }

  try {
    return { recipientEmails: await updateNotificationSettings(event, recipientEmails) };
  } catch (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Unable to save notification settings" });
  }
});
