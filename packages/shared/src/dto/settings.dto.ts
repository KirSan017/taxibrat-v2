import { z } from "zod";

export const updateSettingsSchema = z.object({
  updates: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string(),
    })
  ).min(1),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
