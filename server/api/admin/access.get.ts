import { requireAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async event => {
  await requireAdmin(event);
  return { authorized: true };
});
