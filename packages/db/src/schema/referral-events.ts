import { pgTable, uuid, integer, pgEnum, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { tickets } from "./tickets";

export const referralEventTypeEnum = pgEnum("referral_event_type", [
  "REGISTRATION", "RENTAL", "BUYOUT",
]);

export const referralEvents = pgTable(
  "referral_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inviterId: uuid("inviter_id").notNull().references(() => users.id),
    inviteeId: uuid("invitee_id").notNull().references(() => users.id),
    eventType: referralEventTypeEnum("event_type").notNull(),
    inviterPointsAwarded: integer("inviter_points_awarded").notNull().default(0),
    inviteePointsAwarded: integer("invitee_points_awarded").notNull().default(0),
    relatedTicketId: uuid("related_ticket_id").references(() => tickets.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("referral_inviter_idx").on(table.inviterId),
    index("referral_invitee_idx").on(table.inviteeId),
  ]
);
