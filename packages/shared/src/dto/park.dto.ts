import { z } from "zod";
import { DriverClass, District, ParkStatus } from "../enums";

export const createParkSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  phone: z.string().min(1).max(20),
  city: z.string().default("moscow"),
  district: z.nativeEnum(District).optional(),
});

export const updateParkSchema = createParkSchema.partial().extend({
  isAdvertised: z.boolean().optional(),
  isSuperAdvertised: z.boolean().optional(),
  status: z.nativeEnum(ParkStatus).optional(),
});

export const createClassSchema = z.object({
  driverClass: z.nativeEnum(DriverClass),
  parkCommission: z.number().min(0).max(100),
  withdrawalCommission: z.number().min(0).max(100),
  transferCommission: z.number().min(0).max(100),
  deposit: z.number().int().min(0),
  depositReturnDays: z.number().int().min(0),
  latePenalty: z.number().int().min(0),
  trafficFinePenalty: z.number().int().min(0),
  terminationDays: z.number().int().min(0),
  contractFairness: z.number().int().min(1).max(5),
  contractMatch: z.number().int().min(1).max(5),
  daysOff: z.number().int().min(1).max(5),
  newDriverPromoDays: z.number().min(0),
  maxPromoDaysInClass: z.number().min(0),
  replacementCar: z.number().int().min(1).max(5),
  insurance: z.number().int().min(1).max(5),
  inspectionFreq: z.number().int().min(1).max(5),
  maintenanceDay: z.number().int().min(1).max(5),
  extraScratch: z.number().int().min(1).max(5),
  repairDowntime: z.number().int().min(1).max(6),
  selfRepair: z.number().int().min(1).max(3),
  repairPricing: z.number().int().min(1).max(3),
});

export const updateClassSchema = createClassSchema.partial();

export const createVehicleSchema = z.object({
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  year: z.number().int().min(2000).max(2030),
  rentPrice: z.number().int().min(0),
  isAvailable: z.boolean().default(true),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateParkDto = z.infer<typeof createParkSchema>;
export type UpdateParkDto = z.infer<typeof updateParkSchema>;
export type CreateClassDto = z.infer<typeof createClassSchema>;
export type UpdateClassDto = z.infer<typeof updateClassSchema>;
export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
