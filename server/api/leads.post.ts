import type { CreateLeadRequest } from "~/types/offer";
import { createEstimate } from "../utils/pricing";
import { searchPokewallet } from "../utils/pokewallet";
import { createLeadRepository } from "../utils/repository";
import { leadSchema } from "../utils/validation";

export default defineEventHandler(async event => {
  const parsed = leadSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid lead", data: parsed.error.flatten() });
  }
  try {
    const input = parsed.data as CreateLeadRequest;
    const cards = [];
    for (const item of input.cards) {
      const matches = await searchPokewallet(item.cardId);
      const card = matches.find(candidate => candidate.id === item.cardId);
      if (!card) throw new Error(`Card not found: ${item.cardId}`);
      cards.push(card);
    }
    const config = useRuntimeConfig();
    const estimate = createEstimate(cards, input.cards, Number(config.offerRate));
    const leadId = await createLeadRepository().createLead(input, estimate);
    return { leadId, estimate };
  } catch (error) {
    console.error(error);
    throw createError({ statusCode: 502, statusMessage: "Unable to calculate or save offer" });
  }
});
