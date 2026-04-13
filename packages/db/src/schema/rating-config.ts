import { pgTable, uuid, decimal, timestamp } from "drizzle-orm/pg-core";

export const ratingConfig = pgTable("rating_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  priceCoefficient: decimal("price_coefficient", { precision: 3, scale: 2 }).notNull().default("0.60"),
  paramsCoefficient: decimal("params_coefficient", { precision: 3, scale: 2 }).notNull().default("0.40"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
