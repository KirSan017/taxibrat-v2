import { z } from "zod";
import { VerificationMethod } from "../enums";

export const sendCodeSchema = z.object({
  phone: z.string().regex(/^\+7\d{10}$/, "Phone must be in format +7XXXXXXXXXX"),
  method: z.nativeEnum(VerificationMethod),
});

export const verifyCodeSchema = z.object({
  phone: z.string().regex(/^\+7\d{10}$/, "Phone must be in format +7XXXXXXXXXX"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SendCodeDto = z.infer<typeof sendCodeSchema>;
export type VerifyCodeDto = z.infer<typeof verifyCodeSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
