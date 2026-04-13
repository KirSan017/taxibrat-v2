import { z } from "zod";

export const adjustPointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  description: z.string().min(1).max(300),
});

export const pointsHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AdjustPointsDto = z.infer<typeof adjustPointsSchema>;
export type PointsHistoryDto = z.infer<typeof pointsHistorySchema>;
