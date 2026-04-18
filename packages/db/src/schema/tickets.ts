import {
  pgTable, uuid, varchar, text, integer, pgEnum, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const ticketTopicEnum = pgEnum("ticket_topic", [
  "PARK_CHECK", "USER_BASE_CHECK", "TAXI_CONNECT",
  "BUYOUT", "LEGAL", "FRIENDSHIP_POINTS", "IDEA", "OTHER",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "NEW", "IN_PROGRESS", "PENDING_SM_REVIEW",
  "SM_REJECTED", "COMPLETED", "CANCELLED",
]);

export const relatedEntityTypeEnum = pgEnum("related_entity_type", [
  "PARK", "PARK_CLASS", "VEHICLE", "USER",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    topic: ticketTopicEnum("topic").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("NEW"),
    relatedEntityType: relatedEntityTypeEnum("related_entity_type"),
    relatedEntityId: uuid("related_entity_id"),
    smReviewedById: uuid("sm_reviewed_by_id").references(() => users.id),
    smRejectionReason: text("sm_rejection_reason"),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("tickets_user_idx").on(table.userId),
    index("tickets_assigned_idx").on(table.assignedToId),
    index("tickets_status_idx").on(table.status),
    index("tickets_topic_idx").on(table.topic),
  ]
);
