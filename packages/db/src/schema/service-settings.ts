import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const serviceSettings = pgTable("service_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
