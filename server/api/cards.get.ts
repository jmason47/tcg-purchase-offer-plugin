import { searchPokewallet } from "../utils/pokewallet";
import { cardSearchSchema } from "../utils/validation";

export default defineEventHandler(async event => {
  const parsed = cardSearchSchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Search query must be 2-100 characters" });
  }
  try {
    return { cards: await searchPokewallet(parsed.data.q) };
  } catch (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Card pricing service unavailable" });
  }
});
