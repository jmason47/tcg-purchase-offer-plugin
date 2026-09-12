import { z } from "zod";

export const reviewUpdateSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  internalNote: z.string().trim().max(2000).optional(),
});

export function reviewDecision(
  current: "pending" | "accepted" | "rejected",
  requested: "accepted" | "rejected",
): "update" | "unchanged" | "conflict" {
  if (current === requested) return "unchanged";
  if (current !== "pending") return "conflict";
  return "update";
}
