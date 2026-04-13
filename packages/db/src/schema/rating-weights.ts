import { pgTable, uuid, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const ratingWeightEnum = pgEnum("rating_weight_level", ["LOW", "MEDIUM", "HIGH"]);

export const ratingWeights = pgTable("rating_weights", {
  id: uuid("id").defaultRandom().primaryKey(),
  paramName: varchar("param_name", { length: 50 }).notNull().unique(),
  weight: ratingWeightEnum("weight").notNull().default("MEDIUM"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
