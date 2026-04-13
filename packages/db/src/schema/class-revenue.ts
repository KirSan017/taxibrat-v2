import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { driverClassEnum } from "./park-classes";

export const classRevenue = pgTable("class_revenue", {
  id: uuid("id").defaultRandom().primaryKey(),
  driverClass: driverClassEnum("driver_class").notNull().unique(),
  dailyRevenue: integer("daily_revenue").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
