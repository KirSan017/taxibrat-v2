import { pgTable, uuid, integer, decimal, boolean, pgEnum, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { taxiParks } from "./taxi-parks";
import { users } from "./users";

export const driverClassEnum = pgEnum("driver_class", [
  "ECONOMY", "COMFORT", "COMFORT_PLUS", "BUSINESS", "PREMIER", "ELITE",
]);

export const parkClasses = pgTable(
  "park_classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parkId: uuid("park_id").notNull().references(() => taxiParks.id, { onDelete: "cascade" }),
    driverClass: driverClassEnum("driver_class").notNull(),
    parkCommission: decimal("park_commission", { precision: 5, scale: 2 }).notNull().default("0"),
    withdrawalCommission: decimal("withdrawal_commission", { precision: 5, scale: 2 }).notNull().default("0"),
    transferCommission: decimal("transfer_commission", { precision: 5, scale: 2 }).notNull().default("0"),
    deposit: integer("deposit").notNull().default(0),
    depositReturnDays: integer("deposit_return_days").notNull().default(0),
    latePenalty: integer("late_penalty").notNull().default(0),
    trafficFinePenalty: integer("traffic_fine_penalty").notNull().default(0),
    terminationDays: integer("termination_days").notNull().default(0),
    contractFairness: integer("contract_fairness").notNull().default(3),
    contractMatch: integer("contract_match").notNull().default(3),
    daysOff: integer("days_off").notNull().default(3),
    newDriverPromoDays: decimal("new_driver_promo_days", { precision: 5, scale: 1 }).notNull().default("0"),
    maxPromoDaysInClass: decimal("max_promo_days_in_class", { precision: 5, scale: 1 }).notNull().default("0"),
    replacementCar: integer("replacement_car").notNull().default(3),
    insurance: integer("insurance").notNull().default(3),
    inspectionFreq: integer("inspection_freq").notNull().default(3),
    maintenanceDay: integer("maintenance_day").notNull().default(3),
    extraScratch: integer("extra_scratch").notNull().default(3),
    repairDowntime: integer("repair_downtime").notNull().default(3),
    selfRepair: integer("self_repair").notNull().default(2),
    repairPricing: integer("repair_pricing").notNull().default(2),
    paramsRating: decimal("params_rating", { precision: 3, scale: 2 }).default("0"),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    hasAvailableCars: boolean("has_available_cars").notNull().default(false),
    lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("park_class_unique").on(table.parkId, table.driverClass),
    index("park_classes_park_idx").on(table.parkId),
  ]
);
