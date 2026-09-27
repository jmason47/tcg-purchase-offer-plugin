import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeCard } from "./pokewallet";

describe("PokéWallet card normalization", () => {
  beforeEach(() => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      usdToGbpRate: 1,
      eurToGbpRate: 1,
    }));
  });

  it("preserves the TCGplayer printing variant", () => {
    const card = normalizeCard({
      id: "card-1",
      card_info: { name: "Pikachu", set_name: "Example Set", card_number: "1" },
      tcgplayer: { prices: [{ sub_type_name: "Reverse Holofoil", market_price: 12.5 }] },
    });

    expect(card?.variant).toBe("Reverse Holofoil");
    expect(card?.marketPriceCents).toBe(1_250);
  });

  it("uses the most conservative valid Cardmarket reference", () => {
    const card = normalizeCard({
      id: "card-2",
      card_info: { name: "Pikachu" },
      tcgplayer: { prices: [{ sub_type_name: "Normal", market_price: 10 }] },
      cardmarket: { prices: [{ variant_type: "holo", avg: 8, avg7: 8.2, avg30: 7.5 }] },
    });

    expect(card?.variant).toBe("Holofoil");
    expect(card?.marketPriceCents).toBe(750);
  });

  it("does not let an inflated seven-day average set the market price", () => {
    const card = normalizeCard({
      id: "card-3",
      card_info: { name: "Mew ex" },
      cardmarket: { prices: [{ variant_type: "normal", avg7: 830, avg30: 590, trend: 610 }] },
    }, undefined, undefined, {
      eurToGbp: 1,
      usdToGbp: 1,
    });

    expect(card?.marketPriceCents).toBe(59000);
  });

  it("omits zero-priced results", () => {
    const card = normalizeCard({
      id: "card-4",
      card_info: { name: "Pikachu" },
      cardmarket: { prices: [{ variant_type: "normal", avg30: 0 }] },
    });

    expect(card).toBeNull();
  });
});
