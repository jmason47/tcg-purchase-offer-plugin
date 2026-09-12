import { describe, expect, it } from "vitest";
import { cardSearchSchema, leadSchema } from "./validation";

describe("request validation", () => {
  it("rejects short card searches", () => {
    expect(cardSearchSchema.safeParse({ q: "a" }).success).toBe(false);
  });

  it("rejects invalid leads and quantities", () => {
    expect(leadSchema.safeParse({
      contact: { name: "A", email: "invalid" },
      cards: [],
    }).success).toBe(false);
    expect(leadSchema.safeParse({
      contact: { name: "Ash Ketchum", email: "ash@example.com" },
      cards: [{ cardId: "charizard-1", quantity: 100 }],
    }).success).toBe(false);
  });
});
