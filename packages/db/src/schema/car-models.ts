import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { carBrands } from "./car-brands";

export const carModels = pgTable(
  "car_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").notNull().references(() => carBrands.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("car_models_brand_name").on(table.brandId, table.name)]
);
