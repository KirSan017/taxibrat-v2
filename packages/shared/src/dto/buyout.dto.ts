import { z } from "zod";
import { BuyoutOwnerType, BuyoutStatus } from "../enums";

export const createBuyoutSchema = z.object({
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  year: z.number().int().min(2000).max(2030),
  price: z.number().int().min(0),
  mileage: z.number().int().min(0).optional(),
  vin7: z.string().length(7).regex(/^[A-Z0-9]{7}$/, "Last 7 VIN characters (uppercase alphanumeric)"),
  description: z.string().max(5000).optional(),
  photos: z.array(z.string().url()).max(20).default([]),
  ownerType: z.nativeEnum(BuyoutOwnerType),
});

export const updateBuyoutSchema = createBuyoutSchema.partial().omit({ vin7: true });

export const approveBuyoutSchema = z.object({
  ownerName: z.string().max(200).optional(),
  ownerContact: z.string().max(200).optional(),
  ownerAddress: z.string().max(500).optional(),
  ownerPhone: z.string().max(20).optional(),
});

export const rejectBuyoutSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const listBuyoutSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  ownerType: z.nativeEnum(BuyoutOwnerType).optional(),
  priceFrom: z.coerce.number().int().min(0).optional(),
  priceTo: z.coerce.number().int().min(0).optional(),
  status: z.nativeEnum(BuyoutStatus).optional(),
});

export type CreateBuyoutDto = z.infer<typeof createBuyoutSchema>;
export type UpdateBuyoutDto = z.infer<typeof updateBuyoutSchema>;
export type ApproveBuyoutDto = z.infer<typeof approveBuyoutSchema>;
export type RejectBuyoutDto = z.infer<typeof rejectBuyoutSchema>;
export type ListBuyoutDto = z.infer<typeof listBuyoutSchema>;
