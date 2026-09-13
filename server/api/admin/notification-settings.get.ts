import { requireAdmin } from "../../utils/admin";
import { getNotificationSettings } from "../../utils/notificationSettings";

export default defineEventHandler(async event => {
  await requireAdmin(event);
  try {
    return { recipientEmails: await getNotificationSettings(event) };
  } catch (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Unable to load notification settings" });
  }
});
