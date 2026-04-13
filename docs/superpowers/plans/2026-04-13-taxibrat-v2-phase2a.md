# TaxiBrat v2 Phase 2a: Taxi Parks + Rating System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add taxi parks catalog with hierarchical data model (park → class → vehicle), a 20-parameter rating engine with cached scores, visibility rules, and multi-criteria filtering/sorting.

**Architecture:** New Drizzle schema tables (7 tables), 4 NestJS modules (brands, parks, rating, catalog). Rating is computed on-save and cached in DB columns. Visibility is enforced server-side. Sorting criteria changes dynamically based on active filters.

**Tech Stack:** Drizzle ORM (new tables + migrations), NestJS (4 modules), Redis (avg rating cache), DaData API (brand autocomplete fallback)

---

## File Structure

```
packages/shared/src/
├── enums.ts                              # ADD: DriverClass, District, ParkStatus, RatingWeight enums
├── dto/
│   ├── park.dto.ts                       # NEW: DTOs for parks, classes, vehicles
│   ├── catalog.dto.ts                    # NEW: DTOs for catalog queries
│   └── brand.dto.ts                      # NEW: DTOs for brand/model
├── constants.ts                          # ADD: RATING defaults, SEED_REVENUE

packages/db/src/
├── schema/
│   ├── car-brands.ts                     # NEW
│   ├── car-models.ts                     # NEW
│   ├── taxi-parks.ts                     # NEW
│   ├── park-classes.ts                   # NEW
│   ├── park-vehicles.ts                  # NEW
│   ├── rating-weights.ts                 # NEW
│   ├── rating-config.ts                  # NEW
│   └── class-revenue.ts                  # NEW
├── client.ts                             # MODIFY: add new schemas
├── index.ts                              # MODIFY: re-export new schemas
└── seed-rating.ts                        # NEW: seed weights, config, revenue

apps/api/src/modules/
├── brands/
│   ├── brands.module.ts                  # NEW
│   ├── brands.controller.ts              # NEW
│   ├── brands.service.ts                 # NEW
│   └── dadata.provider.ts               # NEW
├── parks/
│   ├── parks.module.ts                   # NEW
│   ├── parks.controller.ts              # NEW
│   ├── parks.service.ts                  # NEW
│   ├── classes.controller.ts             # NEW
│   ├── classes.service.ts                # NEW
│   ├── vehicles.controller.ts            # NEW
│   └── vehicles.service.ts               # NEW
├── rating/
│   ├── rating.module.ts                  # NEW
│   ├── rating.service.ts                 # NEW: pure scoring functions
│   ├── rating.service.spec.ts            # NEW: tests for all 20 params + price
│   ├── rating.recalculator.ts            # NEW: orchestrator
│   └── rating.admin.controller.ts        # NEW
└── catalog/
    ├── catalog.module.ts                 # NEW
    ├── catalog.controller.ts             # NEW
    ├── catalog.service.ts                # NEW: query + sort
    └── visibility.service.ts             # NEW: field masking
```

---

## Task 1: Shared Enums, DTOs, Constants for Phase 2a

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/dto/park.dto.ts`
- Create: `packages/shared/src/dto/catalog.dto.ts`
- Create: `packages/shared/src/dto/brand.dto.ts`
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add enums to enums.ts**

Append to `packages/shared/src/enums.ts`:
```ts
export enum DriverClass {
  ECONOMY = "ECONOMY",
  COMFORT = "COMFORT",
  COMFORT_PLUS = "COMFORT_PLUS",
  BUSINESS = "BUSINESS",
  PREMIER = "PREMIER",
  ELITE = "ELITE",
}

export enum District {
  CAO = "CAO",
  SVAO = "SVAO",
  SAO = "SAO",
  SZAO = "SZAO",
  ZAO = "ZAO",
  UZAO = "UZAO",
  UAO = "UAO",
  UVAO = "UVAO",
  VAO = "VAO",
  MYTISCHI = "MYTISCHI",
  KRASNOGORSK = "KRASNOGORSK",
  DOLGOPRUDNY = "DOLGOPRUDNY",
  KHIMKI = "KHIMKI",
  ODINTSOVO = "ODINTSOVO",
  NOVOMOSKOVSKY = "NOVOMOSKOVSKY",
  BUTOVO = "BUTOVO",
  VIDNOE = "VIDNOE",
  LUBERTSY = "LUBERTSY",
  REUTOV = "REUTOV",
  BALASHIKHA = "BALASHIKHA",
}

export enum ParkStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum RatingWeightLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}
```

- [ ] **Step 2: Create dto/park.dto.ts**

```ts
import { z } from "zod";
import { DriverClass, District, ParkStatus } from "../enums";

export const createParkSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  phone: z.string().min(1).max(20),
  city: z.string().default("moscow"),
  district: z.nativeEnum(District).optional(),
});

export const updateParkSchema = createParkSchema.partial().extend({
  isAdvertised: z.boolean().optional(),
  isSuperAdvertised: z.boolean().optional(),
  status: z.nativeEnum(ParkStatus).optional(),
});

export const createClassSchema = z.object({
  driverClass: z.nativeEnum(DriverClass),
  parkCommission: z.number().min(0).max(100),
  withdrawalCommission: z.number().min(0).max(100),
  transferCommission: z.number().min(0).max(100),
  deposit: z.number().int().min(0),
  depositReturnDays: z.number().int().min(0),
  latePenalty: z.number().int().min(0),
  trafficFinePenalty: z.number().int().min(0),
  terminationDays: z.number().int().min(0),
  contractFairness: z.number().int().min(1).max(5),
  contractMatch: z.number().int().min(1).max(5),
  daysOff: z.number().int().min(1).max(5),
  newDriverPromoDays: z.number().min(0),
  maxPromoDaysInClass: z.number().min(0),
  replacementCar: z.number().int().min(1).max(5),
  insurance: z.number().int().min(1).max(5),
  inspectionFreq: z.number().int().min(1).max(5),
  maintenanceDay: z.number().int().min(1).max(5),
  extraScratch: z.number().int().min(1).max(5),
  repairDowntime: z.number().int().min(1).max(6),
  selfRepair: z.number().int().min(1).max(3),
  repairPricing: z.number().int().min(1).max(3),
});

export const updateClassSchema = createClassSchema.partial();

export const createVehicleSchema = z.object({
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  year: z.number().int().min(2000).max(2030),
  rentPrice: z.number().int().min(0),
  isAvailable: z.boolean().default(true),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateParkDto = z.infer<typeof createParkSchema>;
export type UpdateParkDto = z.infer<typeof updateParkSchema>;
export type CreateClassDto = z.infer<typeof createClassSchema>;
export type UpdateClassDto = z.infer<typeof updateClassSchema>;
export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
```

- [ ] **Step 3: Create dto/catalog.dto.ts**

```ts
import { z } from "zod";
import { DriverClass, District } from "../enums";

export const catalogQuerySchema = z.object({
  driverClass: z.nativeEnum(DriverClass).optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  district: z
    .string()
    .transform((s) => s.split(",").filter(Boolean) as District[])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CatalogQueryDto = z.infer<typeof catalogQuerySchema>;
```

- [ ] **Step 4: Create dto/brand.dto.ts**

```ts
import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createModelSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const brandSearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export type CreateBrandDto = z.infer<typeof createBrandSchema>;
export type CreateModelDto = z.infer<typeof createModelSchema>;
export type BrandSearchDto = z.infer<typeof brandSearchSchema>;
```

- [ ] **Step 5: Add rating constants to constants.ts**

Append to `packages/shared/src/constants.ts`:
```ts
export const RATING = {
  MIN: 0.01,
  MAX: 5.0,
  DEFAULT_PRICE_COEFF: 0.6,
  DEFAULT_PARAMS_COEFF: 0.4,
  WEIGHT_MULTIPLIER: { LOW: 1, MEDIUM: 2, HIGH: 3 } as const,
} as const;

export const SEED_REVENUE: Record<string, number> = {
  ECONOMY: 10000,
  COMFORT: 11000,
  COMFORT_PLUS: 12500,
  BUSINESS: 16000,
  PREMIER: 20000,
  ELITE: 25000,
};
```

- [ ] **Step 6: Update index.ts with new exports**

Add to `packages/shared/src/index.ts`:
```ts
export * from "./dto/park.dto";
export * from "./dto/catalog.dto";
export * from "./dto/brand.dto";
```

- [ ] **Step 7: Install and commit**

```bash
cd /c/Users/Professional/Projects/taxibrat-v2
pnpm install
git add -A
git commit -m "feat: add Phase 2a enums, DTOs, and constants for parks/rating"
```

---

## Task 2: Database Schema — 8 New Tables

**Files:**
- Create: `packages/db/src/schema/car-brands.ts`
- Create: `packages/db/src/schema/car-models.ts`
- Create: `packages/db/src/schema/taxi-parks.ts`
- Create: `packages/db/src/schema/park-classes.ts`
- Create: `packages/db/src/schema/park-vehicles.ts`
- Create: `packages/db/src/schema/rating-weights.ts`
- Create: `packages/db/src/schema/rating-config.ts`
- Create: `packages/db/src/schema/class-revenue.ts`
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create schema/car-brands.ts**

```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const carBrands = pgTable("car_brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create schema/car-models.ts**

```ts
import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { carBrands } from "./car-brands";

export const carModels = pgTable(
  "car_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => carBrands.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("car_models_brand_name").on(table.brandId, table.name)]
);
```

- [ ] **Step 3: Create schema/taxi-parks.ts**

```ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  decimal,
  text,
  pgEnum,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
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
  ]
);
```

- [ ] **Step 4: Create schema/park-classes.ts**

```ts
import {
  pgTable,
  uuid,
  integer,
  decimal,
  boolean,
  pgEnum,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { taxiParks } from "./taxi-parks";
import { users } from "./users";

export const driverClassEnum = pgEnum("driver_class", [
  "ECONOMY", "COMFORT", "COMFORT_PLUS", "BUSINESS", "PREMIER", "ELITE",
]);

export const parkClasses = pgTable(
  "park_classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parkId: uuid("park_id")
      .notNull()
      .references(() => taxiParks.id, { onDelete: "cascade" }),
    driverClass: driverClassEnum("driver_class").notNull(),
    // 20 parameters
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
    // Cached ratings
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
```

- [ ] **Step 5: Create schema/park-vehicles.ts**

```ts
import {
  pgTable,
  uuid,
  integer,
  decimal,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { parkClasses } from "./park-classes";
import { carBrands } from "./car-brands";
import { carModels } from "./car-models";

export const parkVehicles = pgTable(
  "park_vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => parkClasses.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => carBrands.id),
    modelId: uuid("model_id")
      .notNull()
      .references(() => carModels.id),
    year: integer("year").notNull(),
    rentPrice: integer("rent_price").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    // Cached ratings
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
```

- [ ] **Step 6: Create schema/rating-weights.ts**

```ts
import {
  pgTable,
  uuid,
  varchar,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

export const ratingWeightEnum = pgEnum("rating_weight_level", ["LOW", "MEDIUM", "HIGH"]);

export const ratingWeights = pgTable("rating_weights", {
  id: uuid("id").defaultRandom().primaryKey(),
  paramName: varchar("param_name", { length: 50 }).notNull().unique(),
  weight: ratingWeightEnum("weight").notNull().default("MEDIUM"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 7: Create schema/rating-config.ts**

```ts
import {
  pgTable,
  uuid,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";

export const ratingConfig = pgTable("rating_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  priceCoefficient: decimal("price_coefficient", { precision: 3, scale: 2 }).notNull().default("0.60"),
  paramsCoefficient: decimal("params_coefficient", { precision: 3, scale: 2 }).notNull().default("0.40"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 8: Create schema/class-revenue.ts**

```ts
import {
  pgTable,
  uuid,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { driverClassEnum } from "./park-classes";

export const classRevenue = pgTable("class_revenue", {
  id: uuid("id").defaultRandom().primaryKey(),
  driverClass: driverClassEnum("driver_class").notNull().unique(),
  dailyRevenue: integer("daily_revenue").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 9: Update client.ts — add new schemas**

Add imports and spread into schema object in `packages/db/src/client.ts`:
```ts
import * as carBrandsSchema from "./schema/car-brands";
import * as carModelsSchema from "./schema/car-models";
import * as taxiParksSchema from "./schema/taxi-parks";
import * as parkClassesSchema from "./schema/park-classes";
import * as parkVehiclesSchema from "./schema/park-vehicles";
import * as ratingWeightsSchema from "./schema/rating-weights";
import * as ratingConfigSchema from "./schema/rating-config";
import * as classRevenueSchema from "./schema/class-revenue";
```
And add to the schema spread:
```ts
...carBrandsSchema,
...carModelsSchema,
...taxiParksSchema,
...parkClassesSchema,
...parkVehiclesSchema,
...ratingWeightsSchema,
...ratingConfigSchema,
...classRevenueSchema,
```

- [ ] **Step 10: Update index.ts — re-export new schemas**

Add to `packages/db/src/index.ts`:
```ts
export * from "./schema/car-brands";
export * from "./schema/car-models";
export * from "./schema/taxi-parks";
export * from "./schema/park-classes";
export * from "./schema/park-vehicles";
export * from "./schema/rating-weights";
export * from "./schema/rating-config";
export * from "./schema/class-revenue";
```

- [ ] **Step 11: Generate migration, install, and commit**

```bash
cd /c/Users/Professional/Projects/taxibrat-v2
pnpm install
git add -A
git commit -m "feat: add Phase 2a database schema — parks, classes, vehicles, rating tables"
```

---

## Task 3: Rating Seed Data

**Files:**
- Create: `packages/db/src/seed-rating.ts`

- [ ] **Step 1: Create seed-rating.ts**

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ratingWeights } from "./schema/rating-weights";
import { ratingConfig } from "./schema/rating-config";
import { classRevenue } from "./schema/class-revenue";

const PARAM_WEIGHTS: Array<{ paramName: string; weight: "LOW" | "MEDIUM" | "HIGH" }> = [
  { paramName: "parkCommission", weight: "MEDIUM" },
  { paramName: "withdrawalCommission", weight: "MEDIUM" },
  { paramName: "transferCommission", weight: "MEDIUM" },
  { paramName: "deposit", weight: "HIGH" },
  { paramName: "depositReturnDays", weight: "MEDIUM" },
  { paramName: "latePenalty", weight: "MEDIUM" },
  { paramName: "trafficFinePenalty", weight: "MEDIUM" },
  { paramName: "terminationDays", weight: "MEDIUM" },
  { paramName: "contractFairness", weight: "MEDIUM" },
  { paramName: "contractMatch", weight: "MEDIUM" },
  { paramName: "daysOff", weight: "MEDIUM" },
  { paramName: "newDriverPromoDays", weight: "HIGH" },
  { paramName: "replacementCar", weight: "MEDIUM" },
  { paramName: "insurance", weight: "HIGH" },
  { paramName: "inspectionFreq", weight: "MEDIUM" },
  { paramName: "maintenanceDay", weight: "MEDIUM" },
  { paramName: "extraScratch", weight: "HIGH" },
  { paramName: "repairDowntime", weight: "HIGH" },
  { paramName: "selfRepair", weight: "MEDIUM" },
  { paramName: "repairPricing", weight: "MEDIUM" },
];

const REVENUE = [
  { driverClass: "ECONOMY" as const, dailyRevenue: 10000 },
  { driverClass: "COMFORT" as const, dailyRevenue: 11000 },
  { driverClass: "COMFORT_PLUS" as const, dailyRevenue: 12500 },
  { driverClass: "BUSINESS" as const, dailyRevenue: 16000 },
  { driverClass: "PREMIER" as const, dailyRevenue: 20000 },
  { driverClass: "ELITE" as const, dailyRevenue: 25000 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding rating weights...");
  for (const pw of PARAM_WEIGHTS) {
    await db
      .insert(ratingWeights)
      .values(pw)
      .onConflictDoNothing({ target: ratingWeights.paramName });
  }

  console.log("Seeding rating config...");
  const existing = await db.select().from(ratingConfig).limit(1);
  if (existing.length === 0) {
    await db.insert(ratingConfig).values({
      priceCoefficient: "0.60",
      paramsCoefficient: "0.40",
    });
  }

  console.log("Seeding class revenue...");
  for (const rev of REVENUE) {
    await db
      .insert(classRevenue)
      .values(rev)
      .onConflictDoNothing({ target: classRevenue.driverClass });
  }

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to packages/db/package.json**

Add to scripts:
```json
"db:seed-rating": "tsx src/seed-rating.ts"
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add rating seed script for weights, config, and revenue"
```

---

## Task 4: Rating Service (Pure Scoring Functions + Tests)

**Files:**
- Create: `apps/api/src/modules/rating/rating.service.ts`
- Create: `apps/api/src/modules/rating/rating.service.spec.ts`

- [ ] **Step 1: Write tests for rating formulas**

Create `apps/api/src/modules/rating/rating.service.spec.ts`:
```ts
import { RatingService } from "./rating.service";

describe("RatingService", () => {
  let service: RatingService;

  beforeEach(() => {
    service = new RatingService();
  });

  describe("clamp", () => {
    it("should clamp below min", () => {
      expect(service.clamp(-1)).toBe(0.01);
    });
    it("should clamp above max", () => {
      expect(service.clamp(10)).toBe(5.0);
    });
    it("should pass through valid value", () => {
      expect(service.clamp(3.5)).toBe(3.5);
    });
  });

  describe("scoreTransferCommission", () => {
    it("0% = 5.00", () => {
      expect(service.scoreTransferCommission(0)).toBe(5.0);
    });
    it("1% = 3.50", () => {
      expect(service.scoreTransferCommission(1)).toBe(3.5);
    });
    it("10% = 0.01 (clamped)", () => {
      expect(service.scoreTransferCommission(10)).toBe(0.01);
    });
  });

  describe("scoreDeposit", () => {
    it("min deposit = 5.00", () => {
      expect(service.scoreDeposit(5000, 5000)).toBe(5.0);
    });
    it("30000 with min 5000 = 2.50", () => {
      expect(service.scoreDeposit(30000, 5000)).toBe(2.5);
    });
  });

  describe("scoreDepositReturnDays", () => {
    it("0 days = 5.00", () => {
      expect(service.scoreDepositReturnDays(0)).toBe(5.0);
    });
    it("10 days = 3.50", () => {
      expect(service.scoreDepositReturnDays(10)).toBe(3.5);
    });
  });

  describe("scoreLatePenalty", () => {
    it("0 rub = 5.00", () => {
      expect(service.scoreLatePenalty(0)).toBe(5.0);
    });
    it("2500 rub = 2.50", () => {
      expect(service.scoreLatePenalty(2500)).toBe(2.5);
    });
  });

  describe("scoreTrafficFinePenalty", () => {
    it("0 rub = 5.00", () => {
      expect(service.scoreTrafficFinePenalty(0)).toBe(5.0);
    });
    it("100 rub = 3.00", () => {
      expect(service.scoreTrafficFinePenalty(100)).toBe(3.0);
    });
  });

  describe("scoreTerminationDays", () => {
    it("1 day = 5.00", () => {
      expect(service.scoreTerminationDays(1, 1)).toBe(5.0);
    });
    it("10 days with min 1 = 3.20", () => {
      expect(service.scoreTerminationDays(10, 1)).toBe(3.2);
    });
  });

  describe("scoreDirectMapping", () => {
    it("maps 1-5 directly", () => {
      expect(service.scoreDirectMapping(5)).toBe(5.0);
      expect(service.scoreDirectMapping(1)).toBe(1.0);
      expect(service.scoreDirectMapping(3)).toBe(3.0);
    });
  });

  describe("scoreNewDriverPromo", () => {
    it("max days in class = 5.00", () => {
      expect(service.scoreNewDriverPromo(6, 6)).toBe(5.0);
    });
    it("0 days = 0.01", () => {
      expect(service.scoreNewDriverPromo(0, 6)).toBe(0.01);
    });
    it("3 out of 6 = 2.50", () => {
      expect(service.scoreNewDriverPromo(3, 6)).toBe(2.5);
    });
  });

  describe("scoreSelfRepair", () => {
    it("1=1, 2=3, 3=5", () => {
      expect(service.scoreSelfRepair(1)).toBe(1.0);
      expect(service.scoreSelfRepair(2)).toBe(3.0);
      expect(service.scoreSelfRepair(3)).toBe(5.0);
    });
  });

  describe("scoreRepairPricing", () => {
    it("1=1, 2=3, 3=5", () => {
      expect(service.scoreRepairPricing(1)).toBe(1.0);
      expect(service.scoreRepairPricing(2)).toBe(3.0);
      expect(service.scoreRepairPricing(3)).toBe(5.0);
    });
  });

  describe("calcPriceRating", () => {
    it("best price = 5.00", () => {
      expect(service.calcPriceRating(2810, 2810)).toBe(5.0);
    });
    it("higher price = lower rating", () => {
      const rating = service.calcPriceRating(3388, 2810);
      expect(rating).toBeCloseTo(4.15, 1);
    });
  });

  describe("calcParamsRating", () => {
    it("all 5.0 with equal weights = 5.0", () => {
      const scores = Array(20).fill(5.0);
      const multipliers = Array(20).fill(2);
      expect(service.calcParamsRating(scores, multipliers)).toBe(5.0);
    });
  });

  describe("calcTotalRating", () => {
    it("combines price and params with coefficients", () => {
      const total = service.calcTotalRating(5.0, 4.0, 0.6, 0.4);
      expect(total).toBeCloseTo(4.6, 2);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern=rating.service.spec
```

Expected: FAIL (RatingService not found)

- [ ] **Step 3: Implement rating.service.ts**

```ts
import { Injectable } from "@nestjs/common";
import { RATING } from "@taxibrat/shared";

@Injectable()
export class RatingService {
  clamp(value: number): number {
    return Math.max(RATING.MIN, Math.min(RATING.MAX, Math.round(value * 100) / 100));
  }

  // Param 3: Transfer commission
  scoreTransferCommission(percent: number): number {
    return this.clamp(5.0 - percent * 1.5); // each +0.1% = -0.15 → each 1% = -1.5
  }

  // Param 4: Deposit
  scoreDeposit(deposit: number, minInClass: number): number {
    const diff = deposit - minInClass;
    return this.clamp(5.0 - (diff / 1000) * 0.1);
  }

  // Param 5: Deposit return days
  scoreDepositReturnDays(days: number): number {
    return this.clamp(5.0 - days * 0.15);
  }

  // Param 6: Late penalty
  scoreLatePenalty(rubles: number): number {
    return this.clamp(5.0 - (rubles / 100) * 0.1);
  }

  // Param 7: Traffic fine penalty
  scoreTrafficFinePenalty(rubles: number): number {
    return this.clamp(5.0 - (rubles / 10) * 0.2);
  }

  // Param 8: Termination days
  scoreTerminationDays(days: number, minInClass: number): number {
    const diff = days - minInClass;
    return this.clamp(5.0 - diff * 0.2);
  }

  // Params 9-18: direct mapping (value IS the score, 1-5)
  scoreDirectMapping(value: number): number {
    return this.clamp(value);
  }

  // Param 12: New driver promo
  scoreNewDriverPromo(freeDays: number, maxFreeDaysInClass: number): number {
    if (maxFreeDaysInClass <= 0) return this.clamp(0);
    return this.clamp(5.0 * (freeDays / maxFreeDaysInClass));
  }

  // Param 19: Self repair (1→1, 2→3, 3→5)
  scoreSelfRepair(value: number): number {
    const map: Record<number, number> = { 1: 1.0, 2: 3.0, 3: 5.0 };
    return this.clamp(map[value] ?? 3.0);
  }

  // Param 20: Repair pricing (1→1, 2→3, 3→5)
  scoreRepairPricing(value: number): number {
    const map: Record<number, number> = { 1: 1.0, 2: 3.0, 3: 5.0 };
    return this.clamp(map[value] ?? 3.0);
  }

  // Price rating: 5 × (bestCost / thisCost)
  calcPriceRating(thisCost: number, bestCost: number): number {
    if (thisCost <= 0) return this.clamp(0);
    return this.clamp(5.0 * (bestCost / thisCost));
  }

  // Vehicle total cost with commissions
  calcTotalCost(
    rentPrice: number,
    parkCommission: number,
    withdrawalCommission: number,
    dailyRevenue: number,
  ): number {
    const parkComm = dailyRevenue * (parkCommission / 100);
    const netAfterParkComm = dailyRevenue - dailyRevenue * 0.25 - parkComm;
    const withdrawalComm = netAfterParkComm * (withdrawalCommission / 100);
    return rentPrice + parkComm + withdrawalComm;
  }

  // Weighted average of param scores
  calcParamsRating(scores: number[], weightMultipliers: number[]): number {
    let totalWeighted = 0;
    let totalWeight = 0;
    for (let i = 0; i < scores.length; i++) {
      totalWeighted += scores[i] * weightMultipliers[i];
      totalWeight += weightMultipliers[i];
    }
    if (totalWeight === 0) return this.clamp(0);
    return this.clamp(totalWeighted / totalWeight);
  }

  // Final vehicle rating
  calcTotalRating(
    priceRating: number,
    paramsRating: number,
    priceCoeff: number,
    paramsCoeff: number,
  ): number {
    return this.clamp(priceRating * priceCoeff + paramsRating * paramsCoeff);
  }

  // Score all 20 params for a class, returns array of 20 scores
  scoreAllParams(params: {
    transferCommission: number;
    deposit: number;
    depositReturnDays: number;
    latePenalty: number;
    trafficFinePenalty: number;
    terminationDays: number;
    contractFairness: number;
    contractMatch: number;
    daysOff: number;
    newDriverPromoDays: number;
    maxPromoDaysInClass: number;
    replacementCar: number;
    insurance: number;
    inspectionFreq: number;
    maintenanceDay: number;
    extraScratch: number;
    repairDowntime: number;
    selfRepair: number;
    repairPricing: number;
  }, context: {
    minDepositInClass: number;
    minTerminationInClass: number;
  }): number[] {
    return [
      // Params 1-2 (parkCommission, withdrawalCommission) are used in price calc, not scored separately
      // But they need a placeholder score — use 3.0 (neutral) since they're accounted for in price
      3.0, // parkCommission — accounted in price rating
      3.0, // withdrawalCommission — accounted in price rating
      this.scoreTransferCommission(params.transferCommission),
      this.scoreDeposit(params.deposit, context.minDepositInClass),
      this.scoreDepositReturnDays(params.depositReturnDays),
      this.scoreLatePenalty(params.latePenalty),
      this.scoreTrafficFinePenalty(params.trafficFinePenalty),
      this.scoreTerminationDays(params.terminationDays, context.minTerminationInClass),
      this.scoreDirectMapping(params.contractFairness),
      this.scoreDirectMapping(params.contractMatch),
      this.scoreDirectMapping(params.daysOff),
      this.scoreNewDriverPromo(params.newDriverPromoDays, params.maxPromoDaysInClass),
      this.scoreDirectMapping(params.replacementCar),
      this.scoreDirectMapping(params.insurance),
      this.scoreDirectMapping(params.inspectionFreq),
      this.scoreDirectMapping(params.maintenanceDay),
      this.scoreDirectMapping(params.extraScratch),
      this.scoreDirectMapping(params.repairDowntime),
      this.scoreSelfRepair(params.selfRepair),
      this.scoreRepairPricing(params.repairPricing),
    ];
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/api && pnpm test -- --testPathPattern=rating.service.spec
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rating service with pure scoring functions and tests"
```

---

## Task 5: Rating Recalculator

**Files:**
- Create: `apps/api/src/modules/rating/rating.recalculator.ts`
- Create: `apps/api/src/modules/rating/rating.module.ts`
- Create: `apps/api/src/modules/rating/rating.admin.controller.ts`

- [ ] **Step 1: Create rating.recalculator.ts**

```ts
import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  parkClasses,
  parkVehicles,
  taxiParks,
  ratingWeights,
  ratingConfig,
  classRevenue,
} from "@taxibrat/db";
import { RATING, RatingWeightLevel } from "@taxibrat/shared";
import { RatingService } from "./rating.service";
import type Redis from "ioredis";

// Ordered param names matching RatingService.scoreAllParams output
const PARAM_NAMES = [
  "parkCommission", "withdrawalCommission", "transferCommission",
  "deposit", "depositReturnDays", "latePenalty", "trafficFinePenalty",
  "terminationDays", "contractFairness", "contractMatch", "daysOff",
  "newDriverPromoDays", "replacementCar", "insurance", "inspectionFreq",
  "maintenanceDay", "extraScratch", "repairDowntime", "selfRepair", "repairPricing",
];

@Injectable()
export class RatingRecalculator {
  private readonly logger = new Logger(RatingRecalculator.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    private ratingService: RatingService,
  ) {}

  async getWeightMultipliers(): Promise<number[]> {
    const weights = await this.db.select().from(ratingWeights);
    const weightMap = new Map(weights.map((w) => [w.paramName, w.weight]));

    return PARAM_NAMES.map((name) => {
      const level = weightMap.get(name) ?? "MEDIUM";
      return RATING.WEIGHT_MULTIPLIER[level as keyof typeof RATING.WEIGHT_MULTIPLIER];
    });
  }

  async getConfig() {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    return {
      priceCoeff: config ? parseFloat(String(config.priceCoefficient)) : RATING.DEFAULT_PRICE_COEFF,
      paramsCoeff: config ? parseFloat(String(config.paramsCoefficient)) : RATING.DEFAULT_PARAMS_COEFF,
    };
  }

  async getRevenue(driverClass: string): Promise<number> {
    const [rev] = await this.db
      .select()
      .from(classRevenue)
      .where(eq(classRevenue.driverClass, driverClass as any))
      .limit(1);
    return rev?.dailyRevenue ?? 10000;
  }

  async getBestCostInClass(driverClass: string): Promise<number> {
    // Find minimum total cost across all vehicles of this class
    const allClasses = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.driverClass, driverClass as any));

    const revenue = await this.getRevenue(driverClass);
    let bestCost = Infinity;

    for (const cls of allClasses) {
      const vehicles = await this.db
        .select()
        .from(parkVehicles)
        .where(and(eq(parkVehicles.classId, cls.id), eq(parkVehicles.isAvailable, true)));

      for (const v of vehicles) {
        const cost = this.ratingService.calcTotalCost(
          v.rentPrice,
          parseFloat(String(cls.parkCommission)),
          parseFloat(String(cls.withdrawalCommission)),
          revenue,
        );
        if (cost < bestCost) bestCost = cost;
      }
    }

    return bestCost === Infinity ? 0 : bestCost;
  }

  async getClassContext(driverClass: string) {
    const allClasses = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.driverClass, driverClass as any));

    let minDeposit = Infinity;
    let minTermination = Infinity;

    for (const cls of allClasses) {
      if (cls.deposit < minDeposit) minDeposit = cls.deposit;
      if (cls.terminationDays < minTermination) minTermination = cls.terminationDays;
    }

    return {
      minDepositInClass: minDeposit === Infinity ? 0 : minDeposit,
      minTerminationInClass: minTermination === Infinity ? 0 : minTermination,
    };
  }

  async recalcVehicle(vehicleId: string) {
    const [vehicle] = await this.db
      .select()
      .from(parkVehicles)
      .where(eq(parkVehicles.id, vehicleId))
      .limit(1);
    if (!vehicle) return;

    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, vehicle.classId))
      .limit(1);
    if (!cls) return;

    const revenue = await this.getRevenue(cls.driverClass);
    const bestCost = await this.getBestCostInClass(cls.driverClass);
    const config = await this.getConfig();

    const thisCost = this.ratingService.calcTotalCost(
      vehicle.rentPrice,
      parseFloat(String(cls.parkCommission)),
      parseFloat(String(cls.withdrawalCommission)),
      revenue,
    );

    const priceRating = bestCost > 0
      ? this.ratingService.calcPriceRating(thisCost, bestCost)
      : 0.01;

    const paramsRating = parseFloat(String(cls.paramsRating)) || 0.01;
    const totalRating = this.ratingService.calcTotalRating(
      priceRating,
      paramsRating,
      config.priceCoeff,
      config.paramsCoeff,
    );

    await this.db
      .update(parkVehicles)
      .set({
        priceRating: String(priceRating),
        totalRating: String(totalRating),
      })
      .where(eq(parkVehicles.id, vehicleId));
  }

  async recalcClass(classId: string) {
    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, classId))
      .limit(1);
    if (!cls) return;

    // Calc params rating
    const weightMultipliers = await this.getWeightMultipliers();
    const context = await this.getClassContext(cls.driverClass);

    const scores = this.ratingService.scoreAllParams(
      {
        transferCommission: parseFloat(String(cls.transferCommission)),
        deposit: cls.deposit,
        depositReturnDays: cls.depositReturnDays,
        latePenalty: cls.latePenalty,
        trafficFinePenalty: cls.trafficFinePenalty,
        terminationDays: cls.terminationDays,
        contractFairness: cls.contractFairness,
        contractMatch: cls.contractMatch,
        daysOff: cls.daysOff,
        newDriverPromoDays: parseFloat(String(cls.newDriverPromoDays)),
        maxPromoDaysInClass: parseFloat(String(cls.maxPromoDaysInClass)),
        replacementCar: cls.replacementCar,
        insurance: cls.insurance,
        inspectionFreq: cls.inspectionFreq,
        maintenanceDay: cls.maintenanceDay,
        extraScratch: cls.extraScratch,
        repairDowntime: cls.repairDowntime,
        selfRepair: cls.selfRepair,
        repairPricing: cls.repairPricing,
      },
      context,
    );

    const paramsRating = this.ratingService.calcParamsRating(scores, weightMultipliers);

    // Update paramsRating first (vehicles need it)
    await this.db
      .update(parkClasses)
      .set({ paramsRating: String(paramsRating) })
      .where(eq(parkClasses.id, classId));

    // Recalc all vehicles in this class
    const vehicles = await this.db
      .select()
      .from(parkVehicles)
      .where(eq(parkVehicles.classId, classId));

    for (const v of vehicles) {
      await this.recalcVehicle(v.id);
    }

    // Reload vehicles to get updated ratings
    const updatedVehicles = await this.db
      .select()
      .from(parkVehicles)
      .where(and(eq(parkVehicles.classId, classId), eq(parkVehicles.isAvailable, true)));

    const hasAvailable = updatedVehicles.length > 0;
    const classRating = hasAvailable
      ? updatedVehicles.reduce((sum, v) => sum + parseFloat(String(v.totalRating)), 0) / updatedVehicles.length
      : 0;

    await this.db
      .update(parkClasses)
      .set({
        rating: String(this.ratingService.clamp(classRating)),
        hasAvailableCars: hasAvailable,
      })
      .where(eq(parkClasses.id, classId));
  }

  async recalcPark(parkId: string) {
    const classes = await this.db
      .select()
      .from(parkClasses)
      .where(and(eq(parkClasses.parkId, parkId), eq(parkClasses.hasAvailableCars, true)));

    const parkRating = classes.length > 0
      ? classes.reduce((sum, c) => sum + parseFloat(String(c.rating)), 0) / classes.length
      : 0;

    await this.db
      .update(taxiParks)
      .set({ rating: String(this.ratingService.clamp(parkRating)) })
      .where(eq(taxiParks.id, parkId));

    await this.updateAvgRating();
  }

  async recalcAll() {
    this.logger.log("Full recalculation started...");
    const allClasses = await this.db.select().from(parkClasses);

    for (const cls of allClasses) {
      await this.recalcClass(cls.id);
    }

    const parkIds = [...new Set(allClasses.map((c) => c.parkId))];
    for (const parkId of parkIds) {
      await this.recalcPark(parkId);
    }

    this.logger.log(`Full recalculation complete: ${allClasses.length} classes, ${parkIds.length} parks`);
  }

  async updateAvgRating() {
    const result = await this.db
      .select({ avg: sql<number>`avg(${parkClasses.rating}::numeric)` })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(and(eq(taxiParks.status, "ACTIVE"), eq(parkClasses.hasAvailableCars, true)));

    const avg = result[0]?.avg ?? 0;
    await this.redis.set("avg_class_rating", String(avg));
  }

  async getAvgRating(): Promise<number> {
    const cached = await this.redis.get("avg_class_rating");
    return cached ? parseFloat(cached) : 2.5;
  }
}
```

- [ ] **Step 2: Create rating.admin.controller.ts**

```ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "@taxibrat/shared";
import type { Database } from "@taxibrat/db";
import { ratingWeights, ratingConfig, classRevenue } from "@taxibrat/db";
import { RatingRecalculator } from "./rating.recalculator";

@Controller("admin/rating")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RatingAdminController {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  @Get("weights")
  getWeights() {
    return this.db.select().from(ratingWeights);
  }

  @Patch("weights")
  async updateWeights(@Body() updates: Array<{ paramName: string; weight: string }>) {
    for (const u of updates) {
      await this.db
        .update(ratingWeights)
        .set({ weight: u.weight as any })
        .where(eq(ratingWeights.paramName, u.paramName));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Get("config")
  async getConfig() {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    return config;
  }

  @Patch("config")
  async updateConfig(@Body() body: { priceCoefficient: string; paramsCoefficient: string }) {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    if (config) {
      await this.db
        .update(ratingConfig)
        .set(body)
        .where(eq(ratingConfig.id, config.id));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Get("revenue")
  getRevenue() {
    return this.db.select().from(classRevenue);
  }

  @Patch("revenue")
  async updateRevenue(@Body() updates: Array<{ driverClass: string; dailyRevenue: number }>) {
    for (const u of updates) {
      await this.db
        .update(classRevenue)
        .set({ dailyRevenue: u.dailyRevenue })
        .where(eq(classRevenue.driverClass, u.driverClass as any));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Post("recalculate")
  async recalculate() {
    await this.recalculator.recalcAll();
    return { success: true };
  }
}
```

- [ ] **Step 3: Create rating.module.ts**

```ts
import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RatingService } from "./rating.service";
import { RatingRecalculator } from "./rating.recalculator";
import { RatingAdminController } from "./rating.admin.controller";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RatingAdminController],
  providers: [RatingService, RatingRecalculator],
  exports: [RatingService, RatingRecalculator],
})
export class RatingModule {}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add rating recalculator and admin controller for weights/config/revenue"
```

---

## Task 6: Brands Module

**Files:**
- Create: `apps/api/src/modules/brands/brands.module.ts`
- Create: `apps/api/src/modules/brands/brands.controller.ts`
- Create: `apps/api/src/modules/brands/brands.service.ts`
- Create: `apps/api/src/modules/brands/dadata.provider.ts`

- [ ] **Step 1: Create dadata.provider.ts**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface DaDataSuggestion {
  value: string;
  data: { id: string; name: string };
}

@Injectable()
export class DaDataProvider {
  private readonly logger = new Logger(DaDataProvider.name);

  constructor(private config: ConfigService) {}

  async suggestBrands(query: string): Promise<string[]> {
    const token = this.config.get("DADATA_API_KEY");
    if (!token) {
      this.logger.warn("[DEV] DaData not configured, returning empty");
      return [];
    }

    try {
      const res = await fetch(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/car_brand",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, count: 10 }),
        },
      );

      if (!res.ok) return [];
      const data = await res.json();
      return (data.suggestions as DaDataSuggestion[]).map((s) => s.value);
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 2: Create brands.service.ts**

```ts
import { Injectable, Inject, ConflictException } from "@nestjs/common";
import { eq, ilike } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { carBrands, carModels } from "@taxibrat/db";
import { DaDataProvider } from "./dadata.provider";

@Injectable()
export class BrandsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private dadata: DaDataProvider,
  ) {}

  async getAllBrands() {
    return this.db.select().from(carBrands).orderBy(carBrands.name);
  }

  async getModelsByBrand(brandId: string) {
    return this.db
      .select()
      .from(carModels)
      .where(eq(carModels.brandId, brandId))
      .orderBy(carModels.name);
  }

  async createBrand(name: string) {
    try {
      const [brand] = await this.db
        .insert(carBrands)
        .values({ name })
        .returning();
      return brand;
    } catch {
      throw new ConflictException("Brand already exists");
    }
  }

  async createModel(brandId: string, name: string) {
    try {
      const [model] = await this.db
        .insert(carModels)
        .values({ brandId, name })
        .returning();
      return model;
    } catch {
      throw new ConflictException("Model already exists for this brand");
    }
  }

  async searchBrands(query: string) {
    // Local search first
    const local = await this.db
      .select()
      .from(carBrands)
      .where(ilike(carBrands.name, `%${query}%`))
      .limit(10);

    if (local.length >= 5) return local;

    // DaData fallback
    const dadataNames = await this.dadata.suggestBrands(query);
    const localNames = new Set(local.map((b) => b.name.toLowerCase()));

    // Auto-create missing brands from DaData
    for (const name of dadataNames) {
      if (!localNames.has(name.toLowerCase())) {
        try {
          const [created] = await this.db
            .insert(carBrands)
            .values({ name })
            .onConflictDoNothing({ target: carBrands.name })
            .returning();
          if (created) local.push(created);
        } catch {}
      }
    }

    return local;
  }
}
```

- [ ] **Step 3: Create brands.controller.ts**

```ts
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BrandsService } from "./brands.service";
import {
  UserRole,
  createBrandSchema,
  createModelSchema,
  CreateBrandDto,
  CreateModelDto,
} from "@taxibrat/shared";

@Controller()
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  // Public endpoints for catalog filters
  @Get("catalog/brands")
  getAllBrands() {
    return this.brandsService.getAllBrands();
  }

  @Get("catalog/models")
  getModels(@Query("brandId") brandId: string) {
    return this.brandsService.getModelsByBrand(brandId);
  }

  // Admin endpoints
  @Post("admin/brands")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  createBrand(@Body(new ZodValidationPipe(createBrandSchema)) dto: CreateBrandDto) {
    return this.brandsService.createBrand(dto.name);
  }

  @Post("admin/models")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  createModel(@Body(new ZodValidationPipe(createModelSchema)) dto: CreateModelDto) {
    return this.brandsService.createModel(dto.brandId, dto.name);
  }

  @Get("admin/brands/search")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  searchBrands(@Query("q") q: string) {
    return this.brandsService.searchBrands(q || "");
  }
}
```

- [ ] **Step 4: Create brands.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";
import { DaDataProvider } from "./dadata.provider";

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [BrandsService, DaDataProvider],
  exports: [BrandsService],
})
export class BrandsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add brands module with CRUD, search, and DaData fallback"
```

---

## Task 7: Parks Module (CRUD Parks, Classes, Vehicles)

**Files:**
- Create: `apps/api/src/modules/parks/parks.service.ts`
- Create: `apps/api/src/modules/parks/parks.controller.ts`
- Create: `apps/api/src/modules/parks/classes.service.ts`
- Create: `apps/api/src/modules/parks/classes.controller.ts`
- Create: `apps/api/src/modules/parks/vehicles.service.ts`
- Create: `apps/api/src/modules/parks/vehicles.controller.ts`
- Create: `apps/api/src/modules/parks/parks.module.ts`

- [ ] **Step 1: Create parks.service.ts**

```ts
import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { taxiParks, parkClasses } from "@taxibrat/db";
import { CreateParkDto, UpdateParkDto } from "@taxibrat/shared";

@Injectable()
export class ParksService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(dto: CreateParkDto, userId: string) {
    const [park] = await this.db
      .insert(taxiParks)
      .values({ ...dto, createdById: userId })
      .returning();
    return park;
  }

  async getById(id: string) {
    const [park] = await this.db.select().from(taxiParks).where(eq(taxiParks.id, id)).limit(1);
    if (!park) throw new NotFoundException("Park not found");
    return park;
  }

  async list(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db.select().from(taxiParks)
        .orderBy(taxiParks.createdAt)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ count: sql<number>`count(*)` }).from(taxiParks),
    ]);
    return { data, total: Number(countResult[0].count), page, limit };
  }

  async update(id: string, dto: UpdateParkDto) {
    await this.getById(id);
    const [updated] = await this.db
      .update(taxiParks)
      .set(dto)
      .where(eq(taxiParks.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.delete(taxiParks).where(eq(taxiParks.id, id));
    return { success: true };
  }
}
```

- [ ] **Step 2: Create parks.controller.ts**

```ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ParksService } from "./parks.service";
import { UserRole, createParkSchema, updateParkSchema, CreateParkDto, UpdateParkDto } from "@taxibrat/shared";

@Controller("admin/parks")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParksController {
  constructor(private parksService: ParksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createParkSchema)) dto: CreateParkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.parksService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  list(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.parksService.list(parseInt(page), Math.min(parseInt(limit), 100));
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  getById(@Param("id") id: string) {
    return this.parksService.getById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateParkSchema)) dto: UpdateParkDto) {
    return this.parksService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.parksService.delete(id);
  }
}
```

- [ ] **Step 3: Create classes.service.ts**

```ts
import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { parkClasses, parkVehicles } from "@taxibrat/db";
import { CreateClassDto, UpdateClassDto } from "@taxibrat/shared";
import { RatingRecalculator } from "../rating/rating.recalculator";

@Injectable()
export class ClassesService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  async create(parkId: string, dto: CreateClassDto, userId: string) {
    try {
      const [cls] = await this.db
        .insert(parkClasses)
        .values({ ...dto, parkId, lastUpdatedBy: userId })
        .returning();
      await this.recalculator.recalcClass(cls.id);
      await this.recalculator.recalcPark(parkId);
      return cls;
    } catch {
      throw new ConflictException("This class already exists for this park");
    }
  }

  async listByPark(parkId: string) {
    return this.db.select().from(parkClasses).where(eq(parkClasses.parkId, parkId));
  }

  async update(classId: string, dto: UpdateClassDto, userId: string) {
    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    if (!cls) throw new NotFoundException("Class not found");

    const [updated] = await this.db
      .update(parkClasses)
      .set({ ...dto, lastUpdatedBy: userId })
      .where(eq(parkClasses.id, classId))
      .returning();

    await this.recalculator.recalcClass(classId);
    await this.recalculator.recalcPark(cls.parkId);
    return updated;
  }

  async copy(classId: string, newDriverClass: string, userId: string) {
    const [source] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    if (!source) throw new NotFoundException("Source class not found");

    const { id, createdAt, updatedAt, rating, paramsRating, hasAvailableCars, driverClass, ...data } = source;
    const [copied] = await this.db
      .insert(parkClasses)
      .values({ ...data, driverClass: newDriverClass as any, lastUpdatedBy: userId })
      .returning();

    return copied;
  }
}
```

- [ ] **Step 4: Create classes.controller.ts**

```ts
import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ClassesService } from "./classes.service";
import { UserRole, createClassSchema, updateClassSchema, CreateClassDto, UpdateClassDto } from "@taxibrat/shared";

@Controller("admin/parks/:parkId/classes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Post()
  create(
    @Param("parkId") parkId: string,
    @Body(new ZodValidationPipe(createClassSchema)) dto: CreateClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.create(parkId, dto, user.sub);
  }

  @Get()
  list(@Param("parkId") parkId: string) {
    return this.classesService.listByPark(parkId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClassSchema)) dto: UpdateClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.update(id, dto, user.sub);
  }

  @Post(":id/copy")
  copy(
    @Param("id") id: string,
    @Body("driverClass") driverClass: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.copy(id, driverClass, user.sub);
  }
}
```

- [ ] **Step 5: Create vehicles.service.ts**

```ts
import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { parkVehicles, parkClasses } from "@taxibrat/db";
import { CreateVehicleDto, UpdateVehicleDto } from "@taxibrat/shared";
import { RatingRecalculator } from "../rating/rating.recalculator";

@Injectable()
export class VehiclesService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  async create(classId: string, dto: CreateVehicleDto) {
    const [vehicle] = await this.db
      .insert(parkVehicles)
      .values({ ...dto, classId })
      .returning();

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    await this.recalculator.recalcVehicle(vehicle.id);
    await this.recalculator.recalcClass(classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return vehicle;
  }

  async update(vehicleId: string, dto: UpdateVehicleDto) {
    const [vehicle] = await this.db.select().from(parkVehicles).where(eq(parkVehicles.id, vehicleId)).limit(1);
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    const [updated] = await this.db
      .update(parkVehicles)
      .set(dto)
      .where(eq(parkVehicles.id, vehicleId))
      .returning();

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, vehicle.classId)).limit(1);
    await this.recalculator.recalcVehicle(vehicleId);
    await this.recalculator.recalcClass(vehicle.classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return updated;
  }

  async delete(vehicleId: string) {
    const [vehicle] = await this.db.select().from(parkVehicles).where(eq(parkVehicles.id, vehicleId)).limit(1);
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    await this.db.delete(parkVehicles).where(eq(parkVehicles.id, vehicleId));

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, vehicle.classId)).limit(1);
    await this.recalculator.recalcClass(vehicle.classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return { success: true };
  }
}
```

- [ ] **Step 6: Create vehicles.controller.ts**

```ts
import {
  Controller, Post, Patch, Delete, Param, Body, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { VehiclesService } from "./vehicles.service";
import { UserRole, createVehicleSchema, updateVehicleSchema, CreateVehicleDto, UpdateVehicleDto } from "@taxibrat/shared";

@Controller("admin/classes/:classId/vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Param("classId") classId: string,
    @Body(new ZodValidationPipe(createVehicleSchema)) dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(classId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.vehiclesService.delete(id);
  }
}
```

- [ ] **Step 7: Create parks.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ParksController } from "./parks.controller";
import { ParksService } from "./parks.service";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule],
  controllers: [ParksController, ClassesController, VehiclesController],
  providers: [ParksService, ClassesService, VehiclesService],
  exports: [ParksService, ClassesService, VehiclesService],
})
export class ParksModule {}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add parks module with CRUD for parks, classes, and vehicles"
```

---

## Task 8: Catalog Module (Public API with Visibility + Sorting)

**Files:**
- Create: `apps/api/src/modules/catalog/visibility.service.ts`
- Create: `apps/api/src/modules/catalog/catalog.service.ts`
- Create: `apps/api/src/modules/catalog/catalog.controller.ts`
- Create: `apps/api/src/modules/catalog/catalog.module.ts`

- [ ] **Step 1: Create visibility.service.ts**

```ts
import { Injectable } from "@nestjs/common";
import { RatingRecalculator } from "../rating/rating.recalculator";

interface ParkClassRow {
  id: string;
  parkName: string;
  parkAddress: string | null;
  parkPhone: string | null;
  isAdvertised: boolean;
  isSuperAdvertised: boolean;
  rating: string;
  [key: string]: unknown;
}

@Injectable()
export class VisibilityService {
  constructor(private recalculator: RatingRecalculator) {}

  async applyMask(
    rows: ParkClassRow[],
    user: { sub: string; role: string } | null,
  ): Promise<ParkClassRow[]> {
    const avgRating = await this.recalculator.getAvgRating();

    return rows.map((row) => {
      const rating = parseFloat(row.rating) || 0;
      const isHigh = rating > avgRating;
      const isAd = row.isAdvertised || row.isSuperAdvertised;

      const masked = { ...row };

      if (!user) {
        // Anonymous: minimal
        masked.parkAddress = null;
        masked.parkPhone = null;
        (masked as any).addressHidden = true;
        (masked as any).phoneHidden = true;
        (masked as any).detailsBlurred = true;
      } else if (isHigh && !isAd) {
        // Auth + high rating + not advertised: hide name/address/phone
        masked.parkName = null as any;
        masked.parkAddress = null;
        masked.parkPhone = null;
        (masked as any).nameHidden = true;
        (masked as any).addressHidden = true;
        (masked as any).phoneHidden = true;
      } else if (!isAd) {
        // Auth + low rating + not advertised: hide phone only
        masked.parkPhone = null;
        (masked as any).phoneHidden = true;
      }
      // Advertised: show everything (phone only to auth users)
      if (isAd && !user) {
        masked.parkPhone = null;
        (masked as any).phoneHidden = true;
      }

      return masked;
    });
  }
}
```

- [ ] **Step 2: Create catalog.service.ts**

```ts
import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  parkClasses,
  taxiParks,
  parkVehicles,
  carBrands,
  carModels,
} from "@taxibrat/db";
import { CatalogQueryDto } from "@taxibrat/shared";

@Injectable()
export class CatalogService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async listClasses(dto: CatalogQueryDto) {
    const conditions = [
      eq(taxiParks.status, "ACTIVE"),
      eq(parkClasses.hasAvailableCars, true),
    ];

    if (dto.driverClass) {
      conditions.push(eq(parkClasses.driverClass, dto.driverClass as any));
    }

    // Base query: join park_classes with taxi_parks
    let query = this.db
      .select({
        id: parkClasses.id,
        parkId: taxiParks.id,
        parkName: taxiParks.name,
        parkAddress: taxiParks.address,
        parkPhone: taxiParks.phone,
        parkDistrict: taxiParks.district,
        isAdvertised: taxiParks.isAdvertised,
        isSuperAdvertised: taxiParks.isSuperAdvertised,
        driverClass: parkClasses.driverClass,
        rating: parkClasses.rating,
        paramsRating: parkClasses.paramsRating,
        deposit: parkClasses.deposit,
        parkCommission: parkClasses.parkCommission,
        hasAvailableCars: parkClasses.hasAvailableCars,
      })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(and(...conditions))
      .limit(dto.limit)
      .offset((dto.page - 1) * dto.limit);

    // District filter
    if (dto.district && dto.district.length > 0) {
      conditions.push(inArray(taxiParks.district, dto.district as any));
    }

    // Default sort: by rating DESC
    // More complex sorting (by brand/model/year vehicle ratings) is done post-query
    const results = await this.db
      .select({
        id: parkClasses.id,
        parkId: taxiParks.id,
        parkName: taxiParks.name,
        parkAddress: taxiParks.address,
        parkPhone: taxiParks.phone,
        parkDistrict: taxiParks.district,
        isAdvertised: taxiParks.isAdvertised,
        isSuperAdvertised: taxiParks.isSuperAdvertised,
        driverClass: parkClasses.driverClass,
        rating: parkClasses.rating,
        paramsRating: parkClasses.paramsRating,
        deposit: parkClasses.deposit,
        parkCommission: parkClasses.parkCommission,
        hasAvailableCars: parkClasses.hasAvailableCars,
      })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(and(...conditions))
      .orderBy(desc(parkClasses.rating))
      .limit(dto.limit + 50) // fetch extra for re-sorting
      .offset((dto.page - 1) * dto.limit);

    // If brand/model/year filters, re-sort by vehicle-level ratings
    let sorted = results;
    if (dto.brandId || dto.modelId || dto.year) {
      sorted = await this.resortByVehicleRating(results, dto);
    }

    // Apply positioning rules
    return this.applyPositioning(sorted.slice(0, dto.limit));
  }

  private async resortByVehicleRating(
    classes: typeof parkClasses.$inferSelect extends never ? any[] : any[],
    dto: CatalogQueryDto,
  ) {
    const classIds = classes.map((c: any) => c.id);
    if (classIds.length === 0) return classes;

    // Get matching vehicles for these classes
    const vehicleConditions = [inArray(parkVehicles.classId, classIds)];
    if (dto.brandId) vehicleConditions.push(eq(parkVehicles.brandId, dto.brandId));
    if (dto.modelId) vehicleConditions.push(eq(parkVehicles.modelId, dto.modelId));
    if (dto.year) vehicleConditions.push(eq(parkVehicles.year, dto.year));

    const vehicles = await this.db
      .select({
        classId: parkVehicles.classId,
        totalRating: parkVehicles.totalRating,
      })
      .from(parkVehicles)
      .where(and(...vehicleConditions, eq(parkVehicles.isAvailable, true)));

    // Compute avg vehicle rating per class
    const avgByClass = new Map<string, number>();
    const countByClass = new Map<string, number>();
    for (const v of vehicles) {
      const current = avgByClass.get(v.classId) ?? 0;
      const count = countByClass.get(v.classId) ?? 0;
      avgByClass.set(v.classId, current + parseFloat(String(v.totalRating)));
      countByClass.set(v.classId, count + 1);
    }

    // Sort classes by their matching vehicle avg rating
    return classes.sort((a: any, b: any) => {
      const aAvg = (avgByClass.get(a.id) ?? 0) / (countByClass.get(a.id) ?? 1);
      const bAvg = (avgByClass.get(b.id) ?? 0) / (countByClass.get(b.id) ?? 1);
      return bAvg - aAvg;
    });
  }

  private applyPositioning(classes: any[]) {
    // Super advertised always at position 2
    const superAd = classes.filter((c: any) => c.isSuperAdvertised);
    const ads = classes.filter((c: any) => c.isAdvertised && !c.isSuperAdvertised);
    const regular = classes.filter((c: any) => !c.isAdvertised && !c.isSuperAdvertised);

    // Shuffle non-advertised (per ТЗ: random order for non-promoted)
    for (let i = regular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regular[i], regular[j]] = [regular[j], regular[i]];
    }

    // Combine: ads sorted by rating, then regular random
    const combined = [...ads, ...regular];

    // Insert super-ad at position 2 (index 1)
    if (superAd.length > 0) {
      combined.splice(1, 0, ...superAd);
    }

    return combined;
  }

  async getClassDetail(classId: string) {
    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, classId))
      .limit(1);
    if (!cls) return null;

    const [park] = await this.db
      .select()
      .from(taxiParks)
      .where(eq(taxiParks.id, cls.parkId))
      .limit(1);

    const vehicles = await this.db
      .select({
        id: parkVehicles.id,
        brandName: carBrands.name,
        modelName: carModels.name,
        year: parkVehicles.year,
        rentPrice: parkVehicles.rentPrice,
        isAvailable: parkVehicles.isAvailable,
        priceRating: parkVehicles.priceRating,
        totalRating: parkVehicles.totalRating,
      })
      .from(parkVehicles)
      .innerJoin(carBrands, eq(parkVehicles.brandId, carBrands.id))
      .innerJoin(carModels, eq(parkVehicles.modelId, carModels.id))
      .where(eq(parkVehicles.classId, classId))
      .orderBy(desc(parkVehicles.totalRating));

    return { ...cls, park, vehicles };
  }
}
```

- [ ] **Step 3: Create catalog.controller.ts**

```ts
import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  Req,
} from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CatalogService } from "./catalog.service";
import { VisibilityService } from "./visibility.service";
import { catalogQuerySchema, CatalogQueryDto } from "@taxibrat/shared";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Controller("catalog")
export class CatalogController {
  constructor(
    private catalogService: CatalogService,
    private visibilityService: VisibilityService,
    private configService: ConfigService,
  ) {}

  private extractUser(req: Request) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    try {
      return verify(auth.slice(7), this.configService.get("JWT_SECRET")!) as { sub: string; role: string };
    } catch {
      return null;
    }
  }

  @Get("classes")
  async listClasses(
    @Query(new ZodValidationPipe(catalogQuerySchema)) dto: CatalogQueryDto,
    @Req() req: Request,
  ) {
    const user = this.extractUser(req);
    const classes = await this.catalogService.listClasses(dto);
    return this.visibilityService.applyMask(classes as any, user);
  }

  @Get("classes/:id")
  async getClass(@Param("id") id: string, @Req() req: Request) {
    const user = this.extractUser(req);
    const detail = await this.catalogService.getClassDetail(id);
    if (!detail) return { error: "Not found" };

    const [masked] = await this.visibilityService.applyMask(
      [
        {
          ...detail,
          parkName: detail.park?.name ?? "",
          parkAddress: detail.park?.address ?? null,
          parkPhone: detail.park?.phone ?? null,
          isAdvertised: detail.park?.isAdvertised ?? false,
          isSuperAdvertised: detail.park?.isSuperAdvertised ?? false,
        },
      ] as any,
      user,
    );
    return masked;
  }
}
```

- [ ] **Step 4: Create catalog.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { VisibilityService } from "./visibility.service";

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, VisibilityService],
})
export class CatalogModule {}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add catalog module with visibility rules and multi-criteria sorting"
```

---

## Task 9: Wire Up All Modules + Build Verification

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/config/env.validation.ts` (add DADATA_API_KEY)

- [ ] **Step 1: Update env.validation.ts**

Add to envSchema in `apps/api/src/config/env.validation.ts`:
```ts
DADATA_API_KEY: z.string().default(""),
```

- [ ] **Step 2: Update app.module.ts**

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ManagersModule } from "./modules/managers/managers.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { RatingModule } from "./modules/rating/rating.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { ParksModule } from "./modules/parks/parks.module";
import { CatalogModule } from "./modules/catalog/catalog.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    ManagersModule,
    NotificationsModule,
    AuditModule,
    RatingModule,
    BrandsModule,
    ParksModule,
    CatalogModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Build and test**

```bash
cd apps/api && npx nest build
pnpm test
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire up Phase 2a modules — rating, brands, parks, catalog"
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Shared enums, DTOs, constants | `feat: add Phase 2a enums, DTOs, and constants for parks/rating` |
| 2 | DB schema — 8 new tables | `feat: add Phase 2a database schema — parks, classes, vehicles, rating tables` |
| 3 | Rating seed data | `feat: add rating seed script for weights, config, and revenue` |
| 4 | Rating service (pure functions + tests) | `feat: add rating service with pure scoring functions and tests` |
| 5 | Rating recalculator + admin | `feat: add rating recalculator and admin controller for weights/config/revenue` |
| 6 | Brands module | `feat: add brands module with CRUD, search, and DaData fallback` |
| 7 | Parks module (parks + classes + vehicles) | `feat: add parks module with CRUD for parks, classes, and vehicles` |
| 8 | Catalog module (visibility + sorting) | `feat: add catalog module with visibility rules and multi-criteria sorting` |
| 9 | Wire up + build verification | `feat: wire up Phase 2a modules — rating, brands, parks, catalog` |
