import { z } from "zod";
import { NotificationType } from "../enums";

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListNotificationsDto = z.infer<typeof listNotificationsSchema>;

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
