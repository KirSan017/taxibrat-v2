import { z } from "zod";
import { TicketTopic, TicketStatus, RelatedEntityType } from "../enums";

export const createTicketSchema = z.object({
  topic: z.nativeEnum(TicketTopic),
  relatedEntityType: z.nativeEnum(RelatedEntityType).optional(),
  relatedEntityId: z.string().uuid().optional(),
  body: z.string().min(1).max(5000),
});

export const listTicketsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  topic: z.nativeEnum(TicketTopic).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const rejectTicketSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const approveTicketSchema = z.object({
  pointsAwarded: z.number().int().min(0).default(0),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;
export type ListTicketsDto = z.infer<typeof listTicketsSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type RejectTicketDto = z.infer<typeof rejectTicketSchema>;
export type ApproveTicketDto = z.infer<typeof approveTicketSchema>;
