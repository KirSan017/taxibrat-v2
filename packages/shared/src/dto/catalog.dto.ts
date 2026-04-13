import { z } from "zod";
import { DriverClass, District } from "../enums";

export const catalogQuerySchema = z.object({
  driverClass: z.nativeEnum(DriverClass).optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  district: z.string().transform((s) => s.split(",").filter(Boolean) as District[]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CatalogQueryDto = z.infer<typeof catalogQuerySchema>;
