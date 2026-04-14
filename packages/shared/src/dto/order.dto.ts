import { z } from "zod";

export const createNo9OrderSchema = z.object({
  pointFrom: z.string().min(1).max(500),
  pointTo: z.string().min(1).max(500),
});

export const listNo9OrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateNo9OrderDto = z.infer<typeof createNo9OrderSchema>;
export type ListNo9OrdersDto = z.infer<typeof listNo9OrdersSchema>;
