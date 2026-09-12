import type { Card, CardCondition, EstimateLine, OfferEstimate, SelectedCard } from "~/types/offer";

export const DEFAULT_OFFER_RATE = 0.65;
const CONDITION_MULTIPLIERS: Record<CardCondition, number> = {
  NM: 1,
  LP: 0.8,
  MP: 0.6,
  HP: 0.4,
  DMG: 0.2,
};

export function calculateOfferPriceCents(
  marketPriceCents: number,
  offerRate = DEFAULT_OFFER_RATE,
  condition: CardCondition = "NM",
): number {
  if (!Number.isInteger(marketPriceCents) || marketPriceCents < 0) {
    throw new Error("Market price must be a non-negative integer in cents");
  }
  if (offerRate <= 0 || offerRate > 1) {
    throw new Error("Offer rate must be greater than 0 and at most 1");
  }
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition];
  if (conditionMultiplier == null) {
    throw new Error(`Invalid card condition: ${condition}`);
  }
  return Math.round(marketPriceCents * conditionMultiplier * offerRate);
}

export function createEstimate(
  cards: Card[],
  selected: SelectedCard[],
  offerRate = DEFAULT_OFFER_RATE,
  pricedAt = new Date(),
): OfferEstimate {
  const cardById = new Map(cards.map(card => [card.id, card]));
  const lines: EstimateLine[] = selected.map(({ cardId, quantity, condition }) => {
    const card = cardById.get(cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error(`Invalid quantity for card: ${cardId}`);
    }
    const offerPriceCents = calculateOfferPriceCents(card.marketPriceCents, offerRate, condition);
    return {
      cardId: card.id,
      name: card.name,
      variant: card.variant,
      condition,
      quantity,
      marketPriceCents: card.marketPriceCents,
      offerPriceCents,
      totalOfferCents: offerPriceCents * quantity,
    };
  });
  return {
    lines,
    totalMarketPriceCents: lines.reduce((sum, line) => sum + line.marketPriceCents * line.quantity, 0),
    totalOfferCents: lines.reduce((sum, line) => sum + line.totalOfferCents, 0),
    offerRate,
    pricedAt: pricedAt.toISOString(),
  };
}
