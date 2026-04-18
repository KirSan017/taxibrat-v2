import { z } from "zod";

export const createCooperationRequestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(50).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(1).max(5000),
});

export type CreateCooperationRequestDto = z.infer<typeof createCooperationRequestSchema>;

export const listCooperationRequestsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
});

export type ListCooperationRequestsDto = z.infer<typeof listCooperationRequestsSchema>;
