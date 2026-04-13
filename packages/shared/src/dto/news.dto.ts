import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  linkUrl: z.string().url().optional(),
});

export const updateNewsSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  linkUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const listNewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateNewsDto = z.infer<typeof createNewsSchema>;
export type UpdateNewsDto = z.infer<typeof updateNewsSchema>;
export type ListNewsDto = z.infer<typeof listNewsSchema>;
