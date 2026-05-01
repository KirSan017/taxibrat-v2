import { pgTable, uuid, varchar, integer, boolean, text, pgEnum, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { carBrands } from "./car-brands";
import { carModels } from "./car-models";

export const buyoutOwnerTypeEnum = pgEnum("buyout_owner_type", [
  "INDIVIDUAL", "LEGAL_ENTITY", "TAXI_PARK", "BANK",
]);

export const buyoutStatusEnum = pgEnum("buyout_status", [
  "DRAFT", "PENDING_REVIEW", "ACTIVE", "ARCHIVED",
]);

export const buyoutListings = pgTable(
  "buyout_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").notNull().references(() => carBrands.id),
    modelId: uuid("model_id").notNull().references(() => carModels.id),
    year: integer("year").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    price: integer("price").notNull(),
    mileage: integer("mileage"),
    vin7: varchar("vin7", { length: 7 }).notNull().unique(),
    description: text("description"),
    photos: text("photos").array(),
    ownerType: buyoutOwnerTypeEnum("owner_type").notNull(),
    ownerName: varchar("owner_name", { length: 200 }),
    ownerContact: varchar("owner_contact", { length: 200 }),
    ownerAddress: varchar("owner_address", { length: 500 }),
    ownerPhone: varchar("owner_phone", { length: 20 }),
    isAdvertised: boolean("is_advertised").notNull().default(false),
    status: buyoutStatusEnum("status").notNull().default("DRAFT"),
    rejectionReason: text("rejection_reason"),
    createdById: uuid("created_by_id").references(() => users.id),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("buyout_status_idx").on(table.status),
    index("buyout_owner_type_idx").on(table.ownerType),
    index("buyout_brand_idx").on(table.brandId),
  ]
);
