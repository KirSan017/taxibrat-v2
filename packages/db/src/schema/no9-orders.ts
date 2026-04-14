import {
  pgTable, uuid, varchar, integer, pgEnum, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const no9OrderStatusEnum = pgEnum("no9_order_status", [
  "PENDING", "ORDERED", "BANNED", "CANCELLED", "EXPIRED",
]);

export const no9Orders = pgTable(
  "no9_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    pointFrom: varchar("point_from", { length: 500 }).notNull(),
    pointTo: varchar("point_to", { length: 500 }).notNull(),
    status: no9OrderStatusEnum("status").notNull().default("PENDING"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    fiveMinCount: integer("five_min_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("no9_user_idx").on(table.userId),
    index("no9_assigned_idx").on(table.assignedToId),
    index("no9_status_idx").on(table.status),
  ]
);
