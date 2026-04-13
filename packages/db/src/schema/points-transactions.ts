import {
  pgTable, uuid, integer, varchar, pgEnum, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tickets } from "./tickets";

export const pointsTransactionTypeEnum = pgEnum("points_transaction_type", [
  "REGISTRATION", "PARK_CHECK", "TAXI_CONNECT", "BUYOUT", "REFERRAL",
  "ORDER_NO9", "ORDER_CANCEL", "BASE_CHECK", "MANUAL_ADMIN", "IDEA",
]);

export const pointsTransactions = pgTable(
  "points_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    type: pointsTransactionTypeEnum("type").notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    relatedTicketId: uuid("related_ticket_id").references(() => tickets.id),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("points_user_idx").on(table.userId),
    index("points_type_idx").on(table.type),
  ]
);
