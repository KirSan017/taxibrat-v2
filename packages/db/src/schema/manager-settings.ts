import {
  pgTable,
  uuid,
  integer,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const managerSectionEnum = pgEnum("manager_section", [
  "CHAT",
  "TAXI_CHECK",
  "NO_9_PERCENT",
  "USERS",
  "BUYOUT",
]);

export const workStatusEnum = pgEnum("work_status", ["WORKING", "RESTING"]);

export const managerSettings = pgTable(
  "manager_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    section: managerSectionEnum("section").notNull(),
    workStatus: workStatusEnum("work_status").notNull().default("RESTING"),
    fiveMinCount: integer("five_min_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("manager_section_unique").on(table.userId, table.section),
  ]
);
