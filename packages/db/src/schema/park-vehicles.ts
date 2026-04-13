import { pgTable, uuid, integer, decimal, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { parkClasses } from "./park-classes";
import { carBrands } from "./car-brands";
import { carModels } from "./car-models";

export const parkVehicles = pgTable(
  "park_vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id").notNull().references(() => parkClasses.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").notNull().references(() => carBrands.id),
    modelId: uuid("model_id").notNull().references(() => carModels.id),
    year: integer("year").notNull(),
    rentPrice: integer("rent_price").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    priceRating: decimal("price_rating", { precision: 3, scale: 2 }).default("0"),
    totalRating: decimal("total_rating", { precision: 3, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("vehicles_class_idx").on(table.classId),
    index("vehicles_brand_model_idx").on(table.brandId, table.modelId),
  ]
);
