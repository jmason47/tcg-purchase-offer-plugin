export interface Card {
  id: string;
  name: string;
  setName: string;
  number?: string;
  imageUrl?: string;
  marketPriceCents: number;
}

export interface SelectedCard {
  cardId: string;
  quantity: number;
}

export interface EstimateLine {
  cardId: string;
  name: string;
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
