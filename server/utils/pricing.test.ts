import { describe, expect, it } from "vitest";
import { calculateOfferPriceCents, createEstimate } from "./pricing";

const card = {
  id: "charizard-1",
  name: "Charizard",
  setName: "Base Set",
  marketPriceCents: 10_000,
};

describe("pricing", () => {
  it("calculates the default offer rate in cents", () => {
    expect(calculateOfferPriceCents(10_000)).toBe(6_500);
    expect(calculateOfferPriceCents(101)).toBe(66);
  });

  it("creates an auditable estimate for quantities", () => {
    const estimate = createEstimate([card], [{ cardId: card.id, quantity: 2 }]);
    expect(estimate.totalMarketPriceCents).toBe(20_000);
    expect(estimate.totalOfferCents).toBe(13_000);
    expect(estimate.lines[0]?.offerPriceCents).toBe(6_500);
  });

  it("rejects unknown cards", () => {
    expect(() => createEstimate([], [{ cardId: "missing", quantity: 1 }])).toThrow("Card not found");
  });
});
