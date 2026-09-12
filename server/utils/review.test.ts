import { describe, expect, it } from "vitest";
import { reviewDecision, reviewUpdateSchema } from "./review";

describe("admin review decisions", () => {
  it("allows pending leads to be reviewed", () => {
    expect(reviewDecision("pending", "accepted")).toBe("update");
    expect(reviewDecision("pending", "rejected")).toBe("update");
  });

  it("makes repeated updates idempotent and blocks reversals", () => {
    expect(reviewDecision("accepted", "accepted")).toBe("unchanged");
    expect(reviewDecision("accepted", "rejected")).toBe("conflict");
  });

  it("validates internal review notes", () => {
    expect(reviewUpdateSchema.safeParse({ status: "accepted" }).success).toBe(true);
    expect(reviewUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
  });
});
