import { pgTable, uuid, varchar, boolean, decimal, text, pgEnum, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const districtEnum = pgEnum("district", [
  "CAO", "SVAO", "SAO", "SZAO", "ZAO", "UZAO", "UAO", "UVAO", "VAO",
  "MYTISCHI", "KRASNOGORSK", "DOLGOPRUDNY", "KHIMKI", "ODINTSOVO",
  "NOVOMOSKOVSKY", "BUTOVO", "VIDNOE", "LUBERTSY", "REUTOV", "BALASHIKHA",
]);

export const parkStatusEnum = pgEnum("park_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);

export const taxiParks = pgTable(
  "taxi_parks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    address: varchar("address", { length: 500 }),
    phone: varchar("phone", { length: 20 }),
    city: varchar("city", { length: 50 }).notNull().default("moscow"),
    district: districtEnum("district"),
    isAdvertised: boolean("is_advertised").notNull().default(false),
    isSuperAdvertised: boolean("is_super_advertised").notNull().default(false),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    sources: text("sources").array(),
    createdById: uuid("created_by_id").references(() => users.id),
    status: parkStatusEnum("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("parks_status_idx").on(table.status),
    uniqueIndex("parks_phone_unique_idx").on(table.phone),
  ]
);
