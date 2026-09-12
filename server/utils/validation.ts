import { z } from "zod";

export const cardSearchSchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export const leadSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    phone: z.string().trim().max(30).optional(),
  }),
  cards: z.array(z.object({
    cardId: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(99),
    variant: z.string().trim().min(1).max(100).optional(),
    condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  })).min(1).max(100),
});
