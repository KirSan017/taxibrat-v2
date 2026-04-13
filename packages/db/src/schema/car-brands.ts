import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const carBrands = pgTable("car_brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
