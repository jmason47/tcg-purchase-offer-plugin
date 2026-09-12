export interface Card {
  id: string;
  name: string;
  setName: string;
  number?: string;
  variant?: string;
  imageUrl?: string;
  marketPriceCents: number;
}

export const CARD_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type CardCondition = typeof CARD_CONDITIONS[number];

export const CONDITION_MULTIPLIERS: Record<CardCondition, number> = {
  NM: 1,
  LP: 0.8,
  MP: 0.6,
  HP: 0.4,
  DMG: 0.2,
};

export interface SelectedCard {
  cardId: string;
  quantity: number;
  variant?: string;
  condition: CardCondition;
}

export interface EstimateLine {
  cardId: string;
  name: string;
  variant?: string;
  condition: CardCondition;
  quantity: number;
  marketPriceCents: number;
  offerPriceCents: number;
  totalOfferCents: number;
}

export interface OfferEstimate {
  lines: EstimateLine[];
  totalMarketPriceCents: number;
  totalOfferCents: number;
  offerRate: number;
  pricedAt: string;
}

export interface CreateLeadRequest {
  contact: { name: string; email: string; phone?: string };
  cards: SelectedCard[];
}

export interface CreateLeadResponse {
  leadId: string;
  estimate: OfferEstimate;
}
