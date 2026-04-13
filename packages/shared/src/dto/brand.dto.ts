import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createModelSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export type CreateBrandDto = z.infer<typeof createBrandSchema>;
export type CreateModelDto = z.infer<typeof createModelSchema>;
