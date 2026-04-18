import { z } from "zod";
import { UserRole, UserStatus } from "../enums";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  patronymic: z.string().max(100).optional(),
  email: z.string().email().optional(),
  birthDate: z.string().date().optional(),
  city: z.string().max(100).optional(),
  carClass: z.string().max(20).optional(),
  carBrandId: z.string().uuid().optional(),
  carModelId: z.string().uuid().optional(),
  carYear: z.coerce.number().int().min(1990).max(2099).optional(),
  carPlate: z.string().max(20).optional(),
});

export const rejectUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type RejectUserDto = z.infer<typeof rejectUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersSchema>;

export interface UserResponse {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  email: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  friendshipPoints: number;
  referralCode: string;
  createdAt: string;
  city?: string | null;
  carClass?: string | null;
  carBrandId?: string | null;
  carModelId?: string | null;
  carYear?: number | null;
  carPlate?: string | null;
}
