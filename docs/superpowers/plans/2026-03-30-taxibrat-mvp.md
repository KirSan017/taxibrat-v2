# ТаксиБрат MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a taxi fleet auditor web app where drivers find honest rental conditions, and managers audit parks and verify drivers.

**Architecture:** Next.js 15 App Router monolith — mobile-first driver pages + desktop admin panel in one codebase. Supabase for DB + file storage. Telegram bot for auth + notifications. Rating engine computes weighted scores from audited park data.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL (Supabase), NextAuth.js, Telegram Bot API

**Spec:** `docs/superpowers/specs/2026-03-30-taxibrat-mvp-design.md`

---

## File Structure

```
taxibrat/
├── .env.local                          # Supabase, Telegram, NextAuth secrets
├── prisma/
│   ├── schema.prisma                   # All models: User, TaxiPark, ParkOffer, RatingWeight, Rating, VerificationRequest
│   └── seed.ts                         # Dev seed: 2 parks × 2 offers + weights + admin user
├── src/
│   ├── middleware.ts                    # Protect /admin/* routes — require MANAGER/ADMIN role
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: fonts, Tailwind, metadata
│   │   ├── page.tsx                    # Landing "hook" — search bar + top-3 parks
│   │   ├── park/[id]/page.tsx          # "Bitter truth" — park rating + weak points
│   │   ├── catalog/page.tsx            # Catalog — filtered list, hidden names
│   │   ├── auth/page.tsx               # Telegram Login + mini-survey
│   │   ├── verify/page.tsx             # Photo upload for verification
│   │   ├── verify/status/page.tsx      # "Documents under review" status
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin shell: sidebar nav, role check
│   │   │   ├── page.tsx                # Dashboard: counters + recent requests
│   │   │   ├── parks/
│   │   │   │   ├── page.tsx            # Parks table with search
│   │   │   │   ├── new/page.tsx        # Create park + offers form
│   │   │   │   └── [id]/edit/page.tsx  # Edit park + offers form
│   │   │   ├── weights/page.tsx        # Rating weight sliders (ADMIN only)
│   │   │   └── moderation/page.tsx     # Verification queue
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth Telegram provider
│   │       ├── parks/route.ts               # GET (list+search), POST (create)
│   │       ├── parks/[id]/route.ts          # GET, PUT, DELETE single park
│   │       ├── parks/[id]/offers/route.ts   # GET, POST offers for park
│   │       ├── parks/[id]/offers/[offerId]/route.ts  # PUT, DELETE single offer
│   │       ├── parks/search/route.ts        # GET autocomplete for landing
│   │       ├── rating/recalculate/route.ts  # POST recalculate city ratings
│   │       ├── weights/route.ts             # GET, PUT weights
│   │       ├── verification/route.ts        # GET queue, POST new request
│   │       ├── verification/[id]/route.ts   # PUT approve/reject
│   │       ├── upload/route.ts              # POST file → Supabase Storage
│   │       └── telegram/webhook/route.ts    # POST bot webhook
│   ├── lib/
│   │   ├── prisma.ts                   # Singleton Prisma client
│   │   ├── auth.ts                     # NextAuth config + helpers (getSession, requireRole)
│   │   ├── rating.ts                   # Pure rating calculation + recalculate service
│   │   ├── rating-params.ts            # Parameter metadata: name, direction, type
│   │   ├── supabase.ts                 # Supabase Storage client
│   │   └── telegram.ts                 # Bot: sendMessage, notify on approval/rejection
│   └── components/
│       ├── search-park.tsx             # Autocomplete search input
│       ├── park-card.tsx               # Card for catalog: rating, price, year, blurred name
│       ├── rating-badge.tsx            # Circular rating display (e.g., 4.2/5)
│       ├── rating-breakdown.tsx        # Parameter-by-parameter comparison (bitter truth)
│       ├── filter-bar.tsx              # Catalog filters: class, price range, deposit
│       ├── telegram-login.tsx          # Telegram Login Widget wrapper
│       ├── photo-upload.tsx            # Drag-drop photo upload component
│       ├── verification-card.tsx       # Admin: driver docs + approve/reject buttons
│       ├── weight-sliders.tsx          # Admin: parameter weight sliders summing to 100%
│       └── park-form/
│           ├── index.tsx               # Tabbed form container
│           ├── finance-tab.tsx         # Financial fields
│           ├── vehicle-tab.tsx         # Car fields
│           ├── maintenance-tab.tsx     # Maintenance fields
│           ├── legal-tab.tsx           # Legal fields
│           ├── toxicity-tab.tsx        # Hidden fees / toxicity fields
│           └── bonus-tab.tsx           # Extra bonus fields
└── __tests__/
    ├── lib/
    │   ├── rating.test.ts              # Unit tests for rating algorithm
    │   └── rating-params.test.ts       # Param metadata tests
    └── api/
        ├── parks.test.ts               # API route tests
        └── weights.test.ts             # Weights API tests
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `taxibrat/` (entire Next.js project via create-next-app)
- Create: `.env.local`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd C:/Users/Professional/Projects/Taxi
npx create-next-app@latest taxibrat --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select: Yes to all defaults. This creates the project with App Router, TypeScript, Tailwind, ESLint.

- [ ] **Step 2: Install dependencies**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm install prisma @prisma/client next-auth @supabase/supabase-js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Then install components we'll need:

```bash
npx shadcn@latest add button input label card tabs table badge dialog select slider textarea separator dropdown-menu sheet toast
```

- [ ] **Step 4: Create `.env.local`**

```bash
# File: taxibrat/.env.local
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

TELEGRAM_BOT_TOKEN="your-bot-token-from-botfather"
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="TaxiBratBot"
```

Note: Replace placeholders with real values from Supabase dashboard and @BotFather.

- [ ] **Step 5: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 6: Create Prisma singleton**

```typescript
// File: src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 7: Configure Vitest**

```typescript
// File: taxibrat/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Prisma, shadcn/ui, Vitest"
```

---

## Task 2: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write the full Prisma schema**

```prisma
// File: prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  DRIVER
  MANAGER
  ADMIN
}

enum VerificationStatus {
  NONE
  PENDING
  APPROVED
  REJECTED
}

enum Schedule {
  SEVEN_ZERO   // 7/0
  SIX_ONE      // 6/1
  FIVE_TWO     // 5/2
  TWO_TWO      // 2/2
}

enum FuelType {
  PETROL
  LPG
  CNG
}

enum Transmission {
  AUTO
  MANUAL
}

enum WithdrawalType {
  INSTANT
  DAILY
  WEEKLY
}

enum InsuranceType {
  REGULAR
  TAXI
}

enum ContractType {
  RENT
  RENT_TO_BUY
  EMPLOYMENT
}

enum Citizenship {
  RF
  CIS
  ANY
}

enum PayerType {
  PARK
  DRIVER
  SPLIT
}

enum DriverClass {
  ECONOMY
  COMFORT
  COMFORT_PLUS
  BUSINESS
  MINIVAN
  PREMIUM
}

model User {
  id                 String             @id @default(cuid())
  telegramId         String             @unique
  name               String
  phone              String?
  role               Role               @default(DRIVER)
  driverClass        DriverClass?
  experience         Int?               // years
  photoLicense       String?            // Supabase Storage URL
  photoLicenseBack   String?
  photoSelfie        String?
  verificationStatus VerificationStatus @default(NONE)
  rejectionReason    String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  verificationRequests VerificationRequest[]
  createdParks         TaxiPark[]          @relation("CreatedByManager")
  reviewedRequests     VerificationRequest[] @relation("ReviewedBy")
}

model TaxiPark {
  id             String   @id @default(cuid())
  internalName   String
  city           String   @default("moscow")
  auditorComment String?  @db.Text
  contractScan   String?  // Supabase Storage URL
  isActive       Boolean  @default(true)
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  creator User        @relation("CreatedByManager", fields: [createdBy], references: [id])
  offers  ParkOffer[]
}

model ParkOffer {
  id          String     @id @default(cuid())
  parkId      String
  driverClass DriverClass

  // === Finance ===
  rentPrice        Int          // rubles/day
  schedule         Schedule
  deposit          Int          // total deposit
  initialPayment   Int          // upfront payment
  dailyPayment     Int          // daily accumulation toward deposit
  depositReturnDays Int         // days to return deposit after car return
  parkCommission   Float        // % commission from orders
  withdrawalType   WithdrawalType
  withdrawalFee    Int          // fixed fee or 0

  // === Vehicle ===
  brand          String
  model          String
  year           Int
  fuelType       FuelType
  transmission   Transmission
  mileage        Int            // km
  conditionScore Int            // 1-10
  hasAC          Boolean        @default(false)
  hasHeatedSeats Boolean        @default(false)
  hasBluetooth   Boolean        @default(false)

  // === Maintenance ===
  maintenancePayer PayerType
  tirePayer        PayerType
  repairPayer      PayerType
  freeWash         Boolean      @default(false)
  replacementCar   Boolean      @default(false)

  // === Legal ===
  insuranceType InsuranceType
  hasKasko      Boolean        @default(false)
  hasWaybills   Boolean        @default(false)
  contractType  ContractType
  hasLicense    Boolean        @default(true)

  // === Toxicity ===
  earlyReturnPenalty Int        // rubles, 0 = no penalty
  territoryLimit     Int        // km from base, 0 = unlimited
  dailyMileageLimit  Int        // km/day, 0 = unlimited
  dirtPenalty        Int        // rubles, 0 = no penalty
  hiddenFees         String?    @db.Text
  managementScore    Int        // 1-10

  // === Bonuses ===
  hasBranding    Boolean        @default(false)
  hasChildSeat   Boolean        @default(false)
  ownDevice      Boolean        @default(false)
  homeStorage    Boolean        @default(false)
  minExperience  Int            @default(0)  // years
  citizenship    Citizenship    @default(ANY)
  aggregators    String[]       // ["yandex", "citimobil", ...]
  hasParking     Boolean        @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  park   TaxiPark @relation(fields: [parkId], references: [id], onDelete: Cascade)
  rating Rating?

  @@unique([parkId, driverClass])
}

model RatingWeight {
  id        String @id @default(cuid())
  paramName String
  weight    Float  // 0-100, sum per city = 100
  city      String @default("moscow")

  @@unique([paramName, city])
}

model Rating {
  id          String @id @default(cuid())
  parkOfferId String @unique
  totalScore  Float  // 0-5
  breakdown   Json   // { paramName: { raw, normalized, weighted } }
  updatedAt   DateTime @updatedAt

  parkOffer ParkOffer @relation(fields: [parkOfferId], references: [id], onDelete: Cascade)
}

model VerificationRequest {
  id              String             @id @default(cuid())
  userId          String
  status          VerificationStatus @default(PENDING)
  reviewedBy      String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime           @default(now())

  user     User  @relation(fields: [userId], references: [id])
  reviewer User? @relation("ReviewedBy", fields: [reviewedBy], references: [id])
}
```

- [ ] **Step 2: Push schema to Supabase**

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema with all models"
```

---

## Task 3: Rating Engine (TDD)

**Files:**
- Create: `src/lib/rating-params.ts`
- Create: `src/lib/rating.ts`
- Create: `__tests__/lib/rating.test.ts`

- [ ] **Step 1: Define rating parameter metadata**

```typescript
// File: src/lib/rating-params.ts

export type ParamDirection = "lower_better" | "higher_better" | "boolean_positive" | "boolean_negative";

export interface RatingParam {
  name: string;
  field: string;        // ParkOffer field name
  direction: ParamDirection;
  label: string;        // Human-readable label in Russian
}

// Parameters that participate in rating calculation.
// Fields not listed here (schedule, brand, model, fuelType, transmission,
// contractType, citizenship, aggregators) are filter-only.
export const RATING_PARAMS: RatingParam[] = [
  // Finance
  { name: "rentPrice", field: "rentPrice", direction: "lower_better", label: "Стоимость аренды" },
  { name: "deposit", field: "deposit", direction: "lower_better", label: "Залог" },
  { name: "initialPayment", field: "initialPayment", direction: "lower_better", label: "Первоначальный взнос" },
  { name: "dailyPayment", field: "dailyPayment", direction: "lower_better", label: "Ежедневный платёж" },
  { name: "depositReturnDays", field: "depositReturnDays", direction: "lower_better", label: "Дни возврата залога" },
  { name: "parkCommission", field: "parkCommission", direction: "lower_better", label: "Комиссия парка" },
  { name: "withdrawalFee", field: "withdrawalFee", direction: "lower_better", label: "Комиссия за вывод" },
  // Vehicle
  { name: "year", field: "year", direction: "higher_better", label: "Год выпуска" },
  { name: "conditionScore", field: "conditionScore", direction: "higher_better", label: "Состояние авто" },
  { name: "hasAC", field: "hasAC", direction: "boolean_positive", label: "Кондиционер" },
  { name: "hasHeatedSeats", field: "hasHeatedSeats", direction: "boolean_positive", label: "Подогрев сидений" },
  { name: "hasBluetooth", field: "hasBluetooth", direction: "boolean_positive", label: "Bluetooth" },
  // Maintenance
  { name: "freeWash", field: "freeWash", direction: "boolean_positive", label: "Бесплатная мойка" },
  { name: "replacementCar", field: "replacementCar", direction: "boolean_positive", label: "Подменный авто" },
  // Legal
  { name: "hasKasko", field: "hasKasko", direction: "boolean_positive", label: "КАСКО" },
  { name: "hasWaybills", field: "hasWaybills", direction: "boolean_positive", label: "Путевые листы" },
  { name: "hasLicense", field: "hasLicense", direction: "boolean_positive", label: "Лицензия такси" },
  // Toxicity
  { name: "earlyReturnPenalty", field: "earlyReturnPenalty", direction: "lower_better", label: "Штраф за досрочный возврат" },
  { name: "territoryLimit", field: "territoryLimit", direction: "lower_better", label: "Территориальные ограничения" },
  { name: "dailyMileageLimit", field: "dailyMileageLimit", direction: "lower_better", label: "Лимит пробега" },
  { name: "dirtPenalty", field: "dirtPenalty", direction: "lower_better", label: "Штраф за грязное авто" },
  { name: "managementScore", field: "managementScore", direction: "higher_better", label: "Адекватность руководства" },
  // Bonuses
  { name: "hasBranding", field: "hasBranding", direction: "boolean_positive", label: "Брендирование" },
  { name: "hasChildSeat", field: "hasChildSeat", direction: "boolean_positive", label: "Детское кресло" },
  { name: "ownDevice", field: "ownDevice", direction: "boolean_positive", label: "Своё устройство" },
  { name: "homeStorage", field: "homeStorage", direction: "boolean_positive", label: "Домашнее хранение" },
  { name: "hasParking", field: "hasParking", direction: "boolean_positive", label: "Парковка для личного авто" },
];
```

- [ ] **Step 2: Write failing tests for rating calculation**

```typescript
// File: __tests__/lib/rating.test.ts
import { describe, it, expect } from "vitest";
import { normalizeValue, calculateRatings } from "@/lib/rating";

describe("normalizeValue", () => {
  it("returns 1 when min equals max (no difference)", () => {
    expect(normalizeValue(100, 100, 100, "lower_better")).toBe(1);
  });

  it("normalizes lower_better: lowest value gets 1, highest gets 0", () => {
    // price range 1000-3000, value 1000 (cheapest) → 1
    expect(normalizeValue(1000, 1000, 3000, "lower_better")).toBe(1);
    // price 3000 (most expensive) → 0
    expect(normalizeValue(3000, 1000, 3000, "lower_better")).toBe(0);
    // price 2000 (middle) → 0.5
    expect(normalizeValue(2000, 1000, 3000, "lower_better")).toBe(0.5);
  });

  it("normalizes higher_better: highest value gets 1, lowest gets 0", () => {
    // year range 2018-2024, value 2024 (newest) → 1
    expect(normalizeValue(2024, 2018, 2024, "higher_better")).toBe(1);
    // year 2018 (oldest) → 0
    expect(normalizeValue(2018, 2018, 2024, "higher_better")).toBe(0);
  });

  it("normalizes boolean_positive: true=1, false=0", () => {
    expect(normalizeValue(1, 0, 1, "boolean_positive")).toBe(1);
    expect(normalizeValue(0, 0, 1, "boolean_positive")).toBe(0);
  });

  it("normalizes boolean_negative: true=0, false=1", () => {
    expect(normalizeValue(1, 0, 1, "boolean_negative")).toBe(0);
    expect(normalizeValue(0, 0, 1, "boolean_negative")).toBe(1);
  });
});

describe("calculateRatings", () => {
  const weights = [
    { paramName: "rentPrice", weight: 50 },
    { paramName: "year", weight: 30 },
    { paramName: "hasKasko", weight: 20 },
  ];

  it("gives max score (5.0) to the best offer when only one exists", () => {
    const offers = [
      { id: "a", rentPrice: 1900, year: 2024, hasKasko: true },
    ];
    const result = calculateRatings(offers, weights);
    expect(result[0].totalScore).toBe(5);
    expect(result[0].parkOfferId).toBe("a");
  });

  it("ranks cheaper + newer + insured offer higher", () => {
    const offers = [
      { id: "a", rentPrice: 2500, year: 2020, hasKasko: false },
      { id: "b", rentPrice: 1900, year: 2024, hasKasko: true },
    ];
    const result = calculateRatings(offers, weights);
    const scoreA = result.find((r) => r.parkOfferId === "a")!;
    const scoreB = result.find((r) => r.parkOfferId === "b")!;
    expect(scoreB.totalScore).toBe(5);
    expect(scoreA.totalScore).toBe(0);
  });

  it("correctly weights parameters: price matters more than year", () => {
    const offers = [
      { id: "a", rentPrice: 1900, year: 2020, hasKasko: false }, // cheap but old
      { id: "b", rentPrice: 2500, year: 2024, hasKasko: false }, // expensive but new
    ];
    const result = calculateRatings(offers, weights);
    const scoreA = result.find((r) => r.parkOfferId === "a")!;
    const scoreB = result.find((r) => r.parkOfferId === "b")!;
    // A should win: 50% weight on price (1.0) + 30% on year (0.0) = 0.50
    // B: 50% on price (0.0) + 30% on year (1.0) = 0.30
    expect(scoreA.totalScore).toBeGreaterThan(scoreB.totalScore);
    expect(scoreA.totalScore).toBeCloseTo(2.5, 1); // 0.50 * 5
    expect(scoreB.totalScore).toBeCloseTo(1.5, 1); // 0.30 * 5
  });

  it("includes breakdown with per-param scores", () => {
    const offers = [
      { id: "a", rentPrice: 1900, year: 2024, hasKasko: true },
    ];
    const result = calculateRatings(offers, weights);
    expect(result[0].breakdown).toHaveProperty("rentPrice");
    expect(result[0].breakdown.rentPrice).toEqual({
      raw: 1900,
      normalized: 1,
      weighted: 0.5,
    });
  });

  it("ignores params with zero weight", () => {
    const weightsWithZero = [
      { paramName: "rentPrice", weight: 100 },
      { paramName: "year", weight: 0 },
      { paramName: "hasKasko", weight: 0 },
    ];
    const offers = [
      { id: "a", rentPrice: 1900, year: 2018, hasKasko: false },
      { id: "b", rentPrice: 2500, year: 2024, hasKasko: true },
    ];
    const result = calculateRatings(offers, weightsWithZero);
    const scoreA = result.find((r) => r.parkOfferId === "a")!;
    // A is cheapest, and only price matters → max score
    expect(scoreA.totalScore).toBe(5);
  });

  it("returns empty array for empty offers", () => {
    expect(calculateRatings([], weights)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx vitest run __tests__/lib/rating.test.ts
```

Expected: FAIL — `rating.ts` doesn't exist yet.

- [ ] **Step 4: Implement rating calculation**

```typescript
// File: src/lib/rating.ts
import { RATING_PARAMS, type ParamDirection } from "./rating-params";

interface Weight {
  paramName: string;
  weight: number; // 0-100
}

interface BreakdownEntry {
  raw: number;
  normalized: number;
  weighted: number;
}

interface RatingResult {
  parkOfferId: string;
  totalScore: number;
  breakdown: Record<string, BreakdownEntry>;
}

export function normalizeValue(
  value: number,
  min: number,
  max: number,
  direction: ParamDirection
): number {
  if (min === max) return 1;

  switch (direction) {
    case "lower_better":
      return (max - value) / (max - min);
    case "higher_better":
      return (value - min) / (max - min);
    case "boolean_positive":
      return value ? 1 : 0;
    case "boolean_negative":
      return value ? 0 : 1;
  }
}

export function calculateRatings(
  offers: Array<Record<string, unknown> & { id: string }>,
  weights: Weight[]
): RatingResult[] {
  if (offers.length === 0) return [];

  const activeWeights = weights.filter((w) => w.weight > 0);
  const totalWeight = activeWeights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) return offers.map((o) => ({ parkOfferId: o.id, totalScore: 0, breakdown: {} }));

  // Build param lookup
  const paramMap = new Map(RATING_PARAMS.map((p) => [p.name, p]));

  // Compute min/max for each active param
  const minMax: Record<string, { min: number; max: number }> = {};
  for (const w of activeWeights) {
    const param = paramMap.get(w.paramName);
    if (!param) continue;
    const values = offers.map((o) => Number(o[param.field]) || 0);
    minMax[w.paramName] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  // Calculate scores
  return offers.map((offer) => {
    const breakdown: Record<string, BreakdownEntry> = {};
    let weightedSum = 0;

    for (const w of activeWeights) {
      const param = paramMap.get(w.paramName);
      if (!param) continue;

      const raw = Number(offer[param.field]) || 0;
      const { min, max } = minMax[w.paramName];
      const normalized = normalizeValue(raw, min, max, param.direction);
      const weightFraction = w.weight / totalWeight;
      const weighted = normalized * weightFraction;

      breakdown[w.paramName] = { raw, normalized, weighted };
      weightedSum += weighted;
    }

    return {
      parkOfferId: offer.id,
      totalScore: Math.round(weightedSum * 5 * 100) / 100,
      breakdown,
    };
  });
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/rating.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rating-params.ts src/lib/rating.ts __tests__/lib/rating.test.ts
git commit -m "feat: implement rating calculation engine with TDD"
```

---

## Task 4: Rating Recalculation Service

**Files:**
- Modify: `src/lib/rating.ts` (add `recalculateCity` function)
- Create: `src/app/api/rating/recalculate/route.ts`

- [ ] **Step 1: Add recalculateCity to rating.ts**

Append to the end of `src/lib/rating.ts`:

```typescript
import { prisma } from "./prisma";

export async function recalculateCity(city: string) {
  const weights = await prisma.ratingWeight.findMany({ where: { city } });
  if (weights.length === 0) return;

  // Get all classes that have offers in this city
  const classes = await prisma.parkOffer.findMany({
    where: { park: { city, isActive: true } },
    select: { driverClass: true },
    distinct: ["driverClass"],
  });

  for (const { driverClass } of classes) {
    const offers = await prisma.parkOffer.findMany({
      where: { park: { city, isActive: true }, driverClass },
    });

    const ratings = calculateRatings(
      offers.map((o) => ({ ...o, id: o.id })),
      weights
    );

    for (const r of ratings) {
      await prisma.rating.upsert({
        where: { parkOfferId: r.parkOfferId },
        create: {
          parkOfferId: r.parkOfferId,
          totalScore: r.totalScore,
          breakdown: r.breakdown,
        },
        update: {
          totalScore: r.totalScore,
          breakdown: r.breakdown,
        },
      });
    }
  }
}
```

- [ ] **Step 2: Create recalculate API route**

```typescript
// File: src/app/api/rating/recalculate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { recalculateCity } from "@/lib/rating";
import { requireRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { city = "moscow" } = await req.json();
  await recalculateCity(city);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/rating.ts src/app/api/rating/recalculate/route.ts
git commit -m "feat: add rating recalculation service and API route"
```

---

## Task 5: Auth (NextAuth + Telegram)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create auth config**

```typescript
// File: src/lib/auth.ts
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { prisma } from "./prisma";

function verifyTelegramAuth(data: Record<string, string>): boolean {
  const secret = crypto
    .createHash("sha256")
    .update(process.env.TELEGRAM_BOT_TOKEN!)
    .digest();

  const checkString = Object.keys(data)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");

  return hmac === data.hash;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Telegram",
      credentials: {
        id: { type: "text" },
        first_name: { type: "text" },
        last_name: { type: "text" },
        username: { type: "text" },
        photo_url: { type: "text" },
        auth_date: { type: "text" },
        hash: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        if (!verifyTelegramAuth(credentials)) return null;

        const telegramId = credentials.id;
        const name = [credentials.first_name, credentials.last_name]
          .filter(Boolean)
          .join(" ");

        const user = await prisma.user.upsert({
          where: { telegramId },
          create: { telegramId, name, role: "DRIVER" },
          update: { name },
        });

        return { id: user.id, name: user.name, telegramId, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.telegramId = (user as any).telegramId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.telegramId = token.telegramId as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
  session: { strategy: "jwt" },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(roles: string[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.user.role)) return null;
  return session;
}
```

- [ ] **Step 2: Create NextAuth type augmentation**

```typescript
// File: src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    telegramId: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      role: string;
      telegramId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    telegramId: string;
  }
}
```

- [ ] **Step 3: Create NextAuth route handler**

```typescript
// File: src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: Create middleware for admin route protection**

```typescript
// File: src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
      if (isAdminRoute) {
        return token?.role === "ADMIN" || token?.role === "MANAGER";
      }
      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/verify/:path*"],
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts src/app/api/auth/ src/middleware.ts
git commit -m "feat: add NextAuth with Telegram Login and role-based middleware"
```

---

## Task 6: Supabase Storage + Upload API

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Create Supabase client**

```typescript
// File: src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Note: Create a bucket `verification-photos` in Supabase dashboard (Settings → Storage). Set it to private.

- [ ] **Step 2: Create upload API route**

```typescript
// File: src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "license" | "license_back" | "selfie"

  if (!file || !type) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const path = `${session.user.id}/${type}-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("verification-photos")
    .upload(path, buffer, { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("verification-photos")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/app/api/upload/route.ts
git commit -m "feat: add Supabase Storage client and file upload API"
```

---

## Task 7: Parks CRUD API

**Files:**
- Create: `src/app/api/parks/route.ts`
- Create: `src/app/api/parks/[id]/route.ts`
- Create: `src/app/api/parks/[id]/offers/route.ts`
- Create: `src/app/api/parks/[id]/offers/[offerId]/route.ts`
- Create: `src/app/api/parks/search/route.ts`

- [ ] **Step 1: Parks list + create**

```typescript
// File: src/app/api/parks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "moscow";
  const search = searchParams.get("search") || "";

  const parks = await prisma.taxiPark.findMany({
    where: {
      city,
      isActive: true,
      ...(search && { internalName: { contains: search, mode: "insensitive" } }),
    },
    include: {
      offers: { include: { rating: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(parks);
}

export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const park = await prisma.taxiPark.create({
    data: {
      internalName: body.internalName,
      city: body.city || "moscow",
      auditorComment: body.auditorComment,
      contractScan: body.contractScan,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(park, { status: 201 });
}
```

- [ ] **Step 2: Single park CRUD**

```typescript
// File: src/app/api/parks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const park = await prisma.taxiPark.findUnique({
    where: { id },
    include: {
      offers: { include: { rating: true } },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(park);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const park = await prisma.taxiPark.update({
    where: { id },
    data: {
      internalName: body.internalName,
      auditorComment: body.auditorComment,
      contractScan: body.contractScan,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(park);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.taxiPark.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Offers CRUD**

```typescript
// File: src/app/api/parks/[id]/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recalculateCity } from "@/lib/rating";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const offers = await prisma.parkOffer.findMany({
    where: { parkId: id },
    include: { rating: true },
  });
  return NextResponse.json(offers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const offer = await prisma.parkOffer.create({
    data: { parkId: id, ...body },
  });

  // Recalculate ratings for the city
  const park = await prisma.taxiPark.findUnique({ where: { id } });
  if (park) await recalculateCity(park.city);

  return NextResponse.json(offer, { status: 201 });
}
```

```typescript
// File: src/app/api/parks/[id]/offers/[offerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recalculateCity } from "@/lib/rating";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, offerId } = await params;
  const body = await req.json();

  const offer = await prisma.parkOffer.update({
    where: { id: offerId },
    data: body,
  });

  const park = await prisma.taxiPark.findUnique({ where: { id } });
  if (park) await recalculateCity(park.city);

  return NextResponse.json(offer);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, offerId } = await params;
  await prisma.parkOffer.delete({ where: { id: offerId } });

  const park = await prisma.taxiPark.findUnique({ where: { id } });
  if (park) await recalculateCity(park.city);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Search autocomplete for landing**

```typescript
// File: src/app/api/parks/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "moscow";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const parks = await prisma.taxiPark.findMany({
    where: {
      city,
      isActive: true,
      internalName: { contains: q, mode: "insensitive" },
    },
    select: { id: true, internalName: true },
    take: 10,
  });

  return NextResponse.json(parks);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/parks/ src/app/api/parks/search/
git commit -m "feat: add parks and offers CRUD API with search"
```

---

## Task 8: Weights API

**Files:**
- Create: `src/app/api/weights/route.ts`

- [ ] **Step 1: Create weights API**

```typescript
// File: src/app/api/weights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { recalculateCity } from "@/lib/rating";
import { RATING_PARAMS } from "@/lib/rating-params";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "moscow";

  let weights = await prisma.ratingWeight.findMany({ where: { city } });

  // If no weights exist, seed defaults (equal distribution)
  if (weights.length === 0) {
    const defaultWeight = 100 / RATING_PARAMS.length;
    weights = await Promise.all(
      RATING_PARAMS.map((p) =>
        prisma.ratingWeight.create({
          data: { paramName: p.name, weight: Math.round(defaultWeight * 100) / 100, city },
        })
      )
    );
  }

  return NextResponse.json(weights);
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weights, city = "moscow" } = await req.json() as {
    weights: Array<{ paramName: string; weight: number }>;
    city?: string;
  };

  // Validate sum ≈ 100
  const sum = weights.reduce((s, w) => s + w.weight, 0);
  if (Math.abs(sum - 100) > 0.5) {
    return NextResponse.json(
      { error: `Weights must sum to 100, got ${sum}` },
      { status: 400 }
    );
  }

  for (const w of weights) {
    await prisma.ratingWeight.upsert({
      where: { paramName_city: { paramName: w.paramName, city } },
      create: { paramName: w.paramName, weight: w.weight, city },
      update: { weight: w.weight },
    });
  }

  await recalculateCity(city);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/weights/route.ts
git commit -m "feat: add weights API with auto-seed and recalculation"
```

---

## Task 9: Verification API + Telegram Notifications

**Files:**
- Create: `src/lib/telegram.ts`
- Create: `src/app/api/verification/route.ts`
- Create: `src/app/api/verification/[id]/route.ts`

- [ ] **Step 1: Create Telegram bot helper**

```typescript
// File: src/lib/telegram.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: string, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

export async function notifyApproval(
  telegramId: string,
  parkName: string,
  parkDetails: string
) {
  await sendMessage(
    telegramId,
    `✅ <b>Ваша заявка одобрена!</b>\n\n` +
      `Рекомендуемый таксопарк: <b>${parkName}</b>\n\n` +
      `${parkDetails}\n\n` +
      `Напишите нам, если есть вопросы.`
  );
}

export async function notifyRejection(
  telegramId: string,
  reason: string
) {
  await sendMessage(
    telegramId,
    `❌ <b>Заявка отклонена</b>\n\n` +
      `Причина: ${reason}\n\n` +
      `Вы можете подать заявку повторно, исправив указанные проблемы.`
  );
}
```

- [ ] **Step 2: Create verification list + submit API**

```typescript
// File: src/app/api/verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/auth";

// GET: list verification requests (admin/manager)
export async function GET() {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(requests);
}

// POST: driver submits verification request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Update user profile with photos and info
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      driverClass: body.driverClass,
      experience: body.experience,
      photoLicense: body.photoLicense,
      photoLicenseBack: body.photoLicenseBack,
      photoSelfie: body.photoSelfie,
      verificationStatus: "PENDING",
    },
  });

  const request = await prisma.verificationRequest.create({
    data: { userId: session.user.id },
  });

  return NextResponse.json(request, { status: 201 });
}
```

- [ ] **Step 3: Create approve/reject API**

```typescript
// File: src/app/api/verification/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { notifyApproval, notifyRejection } from "@/lib/telegram";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action, rejectionReason, parkId } = await req.json() as {
    action: "approve" | "reject";
    rejectionReason?: string;
    parkId?: string; // which park to reveal on approval
  };

  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.verificationRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: request.userId },
      data: { verificationStatus: "APPROVED" },
    });

    // Get park details for notification
    if (parkId) {
      const park = await prisma.taxiPark.findUnique({
        where: { id: parkId },
        include: { offers: { include: { rating: true } } },
      });
      if (park) {
        const bestOffer = park.offers.sort(
          (a, b) => (b.rating?.totalScore ?? 0) - (a.rating?.totalScore ?? 0)
        )[0];
        await notifyApproval(
          request.user.telegramId,
          park.internalName,
          `Рейтинг: ${bestOffer?.rating?.totalScore ?? "N/A"}/5\nАренда: ${bestOffer?.rentPrice ?? "N/A"}₽/сут`
        );
      }
    }
  } else {
    const reason = rejectionReason || "Документы не прошли проверку";
    await prisma.verificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: request.userId },
      data: {
        verificationStatus: "REJECTED",
        rejectionReason: reason,
      },
    });

    await notifyRejection(request.user.telegramId, reason);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/telegram.ts src/app/api/verification/
git commit -m "feat: add verification API with Telegram notifications"
```

---

## Task 10: Seed Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed command)

- [ ] **Step 1: Write seed script**

```typescript
// File: prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { telegramId: "admin-seed" },
    create: {
      telegramId: "admin-seed",
      name: "Админ",
      role: "ADMIN",
      verificationStatus: "APPROVED",
    },
    update: {},
  });

  // Create Park A — good park
  const parkA = await prisma.taxiPark.upsert({
    where: { id: "seed-park-a" },
    create: {
      id: "seed-park-a",
      internalName: "СитиДрайв",
      city: "moscow",
      auditorComment: "Отличный парк, прозрачные условия, новые авто",
      createdBy: admin.id,
    },
    update: {},
  });

  // Create Park B — mediocre park
  const parkB = await prisma.taxiPark.upsert({
    where: { id: "seed-park-b" },
    create: {
      id: "seed-park-b",
      internalName: "ЭконоТакси",
      city: "moscow",
      auditorComment: "Много скрытых штрафов, старые авто",
      createdBy: admin.id,
    },
    update: {},
  });

  // Park A offer — Economy
  await prisma.parkOffer.upsert({
    where: { parkId_driverClass: { parkId: parkA.id, driverClass: "ECONOMY" } },
    create: {
      parkId: parkA.id,
      driverClass: "ECONOMY",
      rentPrice: 1900,
      schedule: "SIX_ONE",
      deposit: 5000,
      initialPayment: 3000,
      dailyPayment: 200,
      depositReturnDays: 7,
      parkCommission: 3,
      withdrawalType: "INSTANT",
      withdrawalFee: 0,
      brand: "Skoda",
      model: "Octavia",
      year: 2023,
      fuelType: "LPG",
      transmission: "AUTO",
      mileage: 45000,
      conditionScore: 8,
      hasAC: true,
      hasHeatedSeats: true,
      hasBluetooth: true,
      maintenancePayer: "PARK",
      tirePayer: "PARK",
      repairPayer: "SPLIT",
      freeWash: true,
      replacementCar: true,
      insuranceType: "TAXI",
      hasKasko: true,
      hasWaybills: true,
      contractType: "RENT",
      hasLicense: true,
      earlyReturnPenalty: 0,
      territoryLimit: 0,
      dailyMileageLimit: 0,
      dirtPenalty: 0,
      hiddenFees: null,
      managementScore: 9,
      hasBranding: true,
      hasChildSeat: true,
      ownDevice: false,
      homeStorage: true,
      minExperience: 1,
      citizenship: "ANY",
      aggregators: ["yandex", "citimobil"],
      hasParking: true,
    },
    update: {},
  });

  // Park B offer — Economy
  await prisma.parkOffer.upsert({
    where: { parkId_driverClass: { parkId: parkB.id, driverClass: "ECONOMY" } },
    create: {
      parkId: parkB.id,
      driverClass: "ECONOMY",
      rentPrice: 2500,
      schedule: "SEVEN_ZERO",
      deposit: 30000,
      initialPayment: 15000,
      dailyPayment: 500,
      depositReturnDays: 30,
      parkCommission: 8,
      withdrawalType: "DAILY",
      withdrawalFee: 50,
      brand: "Hyundai",
      model: "Solaris",
      year: 2019,
      fuelType: "PETROL",
      transmission: "MANUAL",
      mileage: 180000,
      conditionScore: 4,
      hasAC: true,
      hasHeatedSeats: false,
      hasBluetooth: false,
      maintenancePayer: "DRIVER",
      tirePayer: "DRIVER",
      repairPayer: "DRIVER",
      freeWash: false,
      replacementCar: false,
      insuranceType: "REGULAR",
      hasKasko: false,
      hasWaybills: false,
      contractType: "RENT",
      hasLicense: true,
      earlyReturnPenalty: 5000,
      territoryLimit: 50,
      dailyMileageLimit: 300,
      dirtPenalty: 2000,
      hiddenFees: "Штраф за опоздание на базу — 1000₽, скрытая комиссия 2% на вывод",
      managementScore: 3,
      hasBranding: false,
      hasChildSeat: false,
      ownDevice: false,
      homeStorage: false,
      minExperience: 3,
      citizenship: "RF",
      aggregators: ["yandex"],
      hasParking: false,
    },
    update: {},
  });

  console.log("Seed complete: 2 parks, 2 offers, 1 admin user");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Install tsx:

```bash
npm install -D tsx
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed complete: 2 parks, 2 offers, 1 admin user"

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed data with 2 parks and admin user"
```

---

## Task 11: Admin Layout + Dashboard

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create admin layout with sidebar**

```tsx
// File: src/app/admin/layout.tsx
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/auth");
  }

  const navItems = [
    { href: "/admin", label: "Дашборд", icon: "📊" },
    { href: "/admin/parks", label: "Парки", icon: "🚕" },
    { href: "/admin/moderation", label: "Модерация", icon: "✅" },
    ...(session.user.role === "ADMIN"
      ? [{ href: "/admin/weights", label: "Веса рейтинга", icon: "⚖️" }]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">ТаксиБрат</h1>
          <p className="text-sm text-muted-foreground">Админка</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          {session.user.name} ({session.user.role})
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard page**

```tsx
// File: src/app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const [totalDrivers, pendingVerifications, totalParks, recentParks] =
    await Promise.all([
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.taxiPark.count({ where: { isActive: true } }),
      prisma.taxiPark.count({
        where: {
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const classCounts = await prisma.parkOffer.groupBy({
    by: ["driverClass"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const recentRequests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const classLabels: Record<string, string> = {
    ECONOMY: "Эконом",
    COMFORT: "Комфорт",
    COMFORT_PLUS: "Комфорт+",
    BUSINESS: "Бизнес",
    MINIVAN: "Минивэн",
    PREMIUM: "Премиум",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Дашборд</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Водителей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDrivers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              На проверке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {pendingVerifications}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Парков в базе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalParks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Новых за неделю
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {recentParks}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Популярные классы авто</CardTitle>
          </CardHeader>
          <CardContent>
            {classCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {classCounts.map((c) => (
                  <div key={c.driverClass} className="flex justify-between">
                    <span>{classLabels[c.driverClass] ?? c.driverClass}</span>
                    <span className="font-medium">{c._count.id} офферов</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние заявки</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет заявок</p>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span>{r.user.name}</span>
                    <span className="text-muted-foreground">
                      {r.createdAt.toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat: add admin layout with sidebar and dashboard page"
```

---

## Task 12: Admin — Parks List + Form

**Files:**
- Create: `src/app/admin/parks/page.tsx`
- Create: `src/app/admin/parks/new/page.tsx`
- Create: `src/app/admin/parks/[id]/edit/page.tsx`
- Create: `src/components/park-form/index.tsx`
- Create: `src/components/park-form/finance-tab.tsx`
- Create: `src/components/park-form/vehicle-tab.tsx`
- Create: `src/components/park-form/maintenance-tab.tsx`
- Create: `src/components/park-form/legal-tab.tsx`
- Create: `src/components/park-form/toxicity-tab.tsx`
- Create: `src/components/park-form/bonus-tab.tsx`

- [ ] **Step 1: Create parks list page**

```tsx
// File: src/app/admin/parks/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ParksPage() {
  const parks = await prisma.taxiPark.findMany({
    include: {
      offers: { include: { rating: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Таксопарки</h2>
        <Button asChild>
          <Link href="/admin/parks/new">Добавить парк</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Город</TableHead>
            <TableHead>Офферов</TableHead>
            <TableHead>Лучший рейтинг</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {parks.map((park) => {
            const bestRating = park.offers
              .map((o) => o.rating?.totalScore ?? 0)
              .sort((a, b) => b - a)[0];

            return (
              <TableRow key={park.id}>
                <TableCell className="font-medium">
                  {park.internalName}
                </TableCell>
                <TableCell>{park.city}</TableCell>
                <TableCell>{park._count.offers}</TableCell>
                <TableCell>
                  {bestRating ? `${bestRating.toFixed(1)}/5` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={park.isActive ? "default" : "secondary"}>
                    {park.isActive ? "Активен" : "Скрыт"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/parks/${park.id}/edit`}>
                      Редактировать
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Create park form component with tabs**

The park form is a client component with 6 tabs. Each tab is a separate file for maintainability. The form handles both create and edit modes.

```tsx
// File: src/components/park-form/index.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FinanceTab } from "./finance-tab";
import { VehicleTab } from "./vehicle-tab";
import { MaintenanceTab } from "./maintenance-tab";
import { LegalTab } from "./legal-tab";
import { ToxicityTab } from "./toxicity-tab";
import { BonusTab } from "./bonus-tab";

export interface ParkFormData {
  internalName: string;
  city: string;
  auditorComment: string;
  offer: OfferFormData;
}

export interface OfferFormData {
  driverClass: string;
  // Finance
  rentPrice: number;
  schedule: string;
  deposit: number;
  initialPayment: number;
  dailyPayment: number;
  depositReturnDays: number;
  parkCommission: number;
  withdrawalType: string;
  withdrawalFee: number;
  // Vehicle
  brand: string;
  model: string;
  year: number;
  fuelType: string;
  transmission: string;
  mileage: number;
  conditionScore: number;
  hasAC: boolean;
  hasHeatedSeats: boolean;
  hasBluetooth: boolean;
  // Maintenance
  maintenancePayer: string;
  tirePayer: string;
  repairPayer: string;
  freeWash: boolean;
  replacementCar: boolean;
  // Legal
  insuranceType: string;
  hasKasko: boolean;
  hasWaybills: boolean;
  contractType: string;
  hasLicense: boolean;
  // Toxicity
  earlyReturnPenalty: number;
  territoryLimit: number;
  dailyMileageLimit: number;
  dirtPenalty: number;
  hiddenFees: string;
  managementScore: number;
  // Bonuses
  hasBranding: boolean;
  hasChildSeat: boolean;
  ownDevice: boolean;
  homeStorage: boolean;
  minExperience: number;
  citizenship: string;
  aggregators: string[];
  hasParking: boolean;
}

const defaultOffer: OfferFormData = {
  driverClass: "ECONOMY",
  rentPrice: 0, schedule: "SIX_ONE", deposit: 0, initialPayment: 0,
  dailyPayment: 0, depositReturnDays: 14, parkCommission: 0,
  withdrawalType: "DAILY", withdrawalFee: 0,
  brand: "", model: "", year: 2024, fuelType: "PETROL",
  transmission: "AUTO", mileage: 0, conditionScore: 5,
  hasAC: false, hasHeatedSeats: false, hasBluetooth: false,
  maintenancePayer: "PARK", tirePayer: "PARK", repairPayer: "SPLIT",
  freeWash: false, replacementCar: false,
  insuranceType: "TAXI", hasKasko: false, hasWaybills: false,
  contractType: "RENT", hasLicense: true,
  earlyReturnPenalty: 0, territoryLimit: 0, dailyMileageLimit: 0,
  dirtPenalty: 0, hiddenFees: "", managementScore: 5,
  hasBranding: false, hasChildSeat: false, ownDevice: false,
  homeStorage: false, minExperience: 0, citizenship: "ANY",
  aggregators: [], hasParking: false,
};

interface Props {
  parkId?: string;
  offerId?: string;
  initial?: { park: Partial<ParkFormData>; offer: Partial<OfferFormData> };
}

export function ParkForm({ parkId, offerId, initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [parkData, setParkData] = useState({
    internalName: initial?.park.internalName ?? "",
    city: initial?.park.city ?? "moscow",
    auditorComment: initial?.park.auditorComment ?? "",
  });
  const [offer, setOffer] = useState<OfferFormData>({
    ...defaultOffer,
    ...initial?.offer,
  });

  const updateOffer = (patch: Partial<OfferFormData>) =>
    setOffer((prev) => ({ ...prev, ...patch }));

  async function handleSubmit() {
    setSaving(true);
    try {
      let pid = parkId;
      if (!pid) {
        const res = await fetch("/api/parks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parkData),
        });
        const park = await res.json();
        pid = park.id;
      } else {
        await fetch(`/api/parks/${pid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parkData),
        });
      }

      if (offerId) {
        await fetch(`/api/parks/${pid}/offers/${offerId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offer),
        });
      } else {
        await fetch(`/api/parks/${pid}/offers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offer),
        });
      }

      router.push("/admin/parks");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Название парка (внутреннее)</Label>
          <Input
            value={parkData.internalName}
            onChange={(e) =>
              setParkData((p) => ({ ...p, internalName: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Город</Label>
          <Input
            value={parkData.city}
            onChange={(e) =>
              setParkData((p) => ({ ...p, city: e.target.value }))
            }
          />
        </div>
      </div>
      <div>
        <Label>Комментарий аудитора</Label>
        <Textarea
          value={parkData.auditorComment}
          onChange={(e) =>
            setParkData((p) => ({ ...p, auditorComment: e.target.value }))
          }
          rows={3}
        />
      </div>

      <Tabs defaultValue="finance">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="vehicle">Авто</TabsTrigger>
          <TabsTrigger value="maintenance">Обслуживание</TabsTrigger>
          <TabsTrigger value="legal">Юридическое</TabsTrigger>
          <TabsTrigger value="toxicity">Токсичность</TabsTrigger>
          <TabsTrigger value="bonus">Бонусы</TabsTrigger>
        </TabsList>
        <TabsContent value="finance">
          <FinanceTab data={offer} onChange={updateOffer} />
        </TabsContent>
        <TabsContent value="vehicle">
          <VehicleTab data={offer} onChange={updateOffer} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceTab data={offer} onChange={updateOffer} />
        </TabsContent>
        <TabsContent value="legal">
          <LegalTab data={offer} onChange={updateOffer} />
        </TabsContent>
        <TabsContent value="toxicity">
          <ToxicityTab data={offer} onChange={updateOffer} />
        </TabsContent>
        <TabsContent value="bonus">
          <BonusTab data={offer} onChange={updateOffer} />
        </TabsContent>
      </Tabs>

      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? "Сохранение..." : parkId ? "Сохранить" : "Создать парк"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create finance tab**

```tsx
// File: src/components/park-form/finance-tab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

export function FinanceTab({ data, onChange }: Props) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>Класс авто</Label>
        <Select value={data.driverClass} onValueChange={(v) => onChange({ driverClass: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ECONOMY">Эконом</SelectItem>
            <SelectItem value="COMFORT">Комфорт</SelectItem>
            <SelectItem value="COMFORT_PLUS">Комфорт+</SelectItem>
            <SelectItem value="BUSINESS">Бизнес</SelectItem>
            <SelectItem value="MINIVAN">Минивэн</SelectItem>
            <SelectItem value="PREMIUM">Премиум</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Стоимость аренды (₽/сут)</Label>
        <Input type="number" value={data.rentPrice} onChange={(e) => onChange({ rentPrice: +e.target.value })} />
      </div>
      <div>
        <Label>График оплаты</Label>
        <Select value={data.schedule} onValueChange={(v) => onChange({ schedule: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SEVEN_ZERO">7/0</SelectItem>
            <SelectItem value="SIX_ONE">6/1</SelectItem>
            <SelectItem value="FIVE_TWO">5/2</SelectItem>
            <SelectItem value="TWO_TWO">2/2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Залог (общая сумма, ₽)</Label>
        <Input type="number" value={data.deposit} onChange={(e) => onChange({ deposit: +e.target.value })} />
      </div>
      <div>
        <Label>Первоначальный взнос (₽)</Label>
        <Input type="number" value={data.initialPayment} onChange={(e) => onChange({ initialPayment: +e.target.value })} />
      </div>
      <div>
        <Label>Ежедневный платёж в счёт залога (₽)</Label>
        <Input type="number" value={data.dailyPayment} onChange={(e) => onChange({ dailyPayment: +e.target.value })} />
      </div>
      <div>
        <Label>Дней до возврата залога</Label>
        <Input type="number" value={data.depositReturnDays} onChange={(e) => onChange({ depositReturnDays: +e.target.value })} />
      </div>
      <div>
        <Label>Комиссия парка (%)</Label>
        <Input type="number" step="0.1" value={data.parkCommission} onChange={(e) => onChange({ parkCommission: +e.target.value })} />
      </div>
      <div>
        <Label>Вывод средств</Label>
        <Select value={data.withdrawalType} onValueChange={(v) => onChange({ withdrawalType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="INSTANT">Моментально</SelectItem>
            <SelectItem value="DAILY">Раз в сутки</SelectItem>
            <SelectItem value="WEEKLY">Раз в неделю</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Комиссия за вывод (₽)</Label>
        <Input type="number" value={data.withdrawalFee} onChange={(e) => onChange({ withdrawalFee: +e.target.value })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create vehicle tab**

```tsx
// File: src/components/park-form/vehicle-tab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

export function VehicleTab({ data, onChange }: Props) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>Марка</Label>
        <Input value={data.brand} onChange={(e) => onChange({ brand: e.target.value })} />
      </div>
      <div>
        <Label>Модель</Label>
        <Input value={data.model} onChange={(e) => onChange({ model: e.target.value })} />
      </div>
      <div>
        <Label>Год выпуска</Label>
        <Input type="number" value={data.year} onChange={(e) => onChange({ year: +e.target.value })} />
      </div>
      <div>
        <Label>Тип топлива</Label>
        <Select value={data.fuelType} onValueChange={(v) => onChange({ fuelType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PETROL">Бензин</SelectItem>
            <SelectItem value="LPG">Газ (пропан)</SelectItem>
            <SelectItem value="CNG">Газ (метан)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>КПП</Label>
        <Select value={data.transmission} onValueChange={(v) => onChange({ transmission: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AUTO">АКПП</SelectItem>
            <SelectItem value="MANUAL">МКПП</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Пробег (км)</Label>
        <Input type="number" value={data.mileage} onChange={(e) => onChange({ mileage: +e.target.value })} />
      </div>
      <div>
        <Label>Состояние (1-10)</Label>
        <Input type="number" min={1} max={10} value={data.conditionScore} onChange={(e) => onChange({ conditionScore: +e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-6">
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasAC} onCheckedChange={(v) => onChange({ hasAC: !!v })} />
          Кондиционер
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasHeatedSeats} onCheckedChange={(v) => onChange({ hasHeatedSeats: !!v })} />
          Подогрев сидений
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasBluetooth} onCheckedChange={(v) => onChange({ hasBluetooth: !!v })} />
          Bluetooth
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create maintenance tab**

```tsx
// File: src/components/park-form/maintenance-tab.tsx
"use client";

import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

function PayerSelect({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="PARK">Парк</SelectItem>
        <SelectItem value="DRIVER">Водитель</SelectItem>
        <SelectItem value="SPLIT">50/50</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function MaintenanceTab({ data, onChange }: Props) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>ТО оплачивает</Label>
        <PayerSelect value={data.maintenancePayer} onValueChange={(v) => onChange({ maintenancePayer: v })} />
      </div>
      <div>
        <Label>Резину оплачивает</Label>
        <PayerSelect value={data.tirePayer} onValueChange={(v) => onChange({ tirePayer: v })} />
      </div>
      <div>
        <Label>Текущий ремонт оплачивает</Label>
        <PayerSelect value={data.repairPayer} onValueChange={(v) => onChange({ repairPayer: v })} />
      </div>
      <div className="col-span-2 flex gap-6">
        <label className="flex items-center gap-2">
          <Checkbox checked={data.freeWash} onCheckedChange={(v) => onChange({ freeWash: !!v })} />
          Бесплатная мойка
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.replacementCar} onCheckedChange={(v) => onChange({ replacementCar: !!v })} />
          Подменный автомобиль
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create legal tab**

```tsx
// File: src/components/park-form/legal-tab.tsx
"use client";

import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

export function LegalTab({ data, onChange }: Props) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>Тип страховки</Label>
        <Select value={data.insuranceType} onValueChange={(v) => onChange({ insuranceType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="REGULAR">ОСАГО обычное</SelectItem>
            <SelectItem value="TAXI">ОСАГО под такси</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Тип договора</Label>
        <Select value={data.contractType} onValueChange={(v) => onChange({ contractType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RENT">Аренда</SelectItem>
            <SelectItem value="RENT_TO_BUY">Аренда с выкупом</SelectItem>
            <SelectItem value="EMPLOYMENT">Трудовой</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 flex gap-6">
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasKasko} onCheckedChange={(v) => onChange({ hasKasko: !!v })} />
          КАСКО
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasWaybills} onCheckedChange={(v) => onChange({ hasWaybills: !!v })} />
          Путевые листы
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasLicense} onCheckedChange={(v) => onChange({ hasLicense: !!v })} />
          Лицензия такси
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create toxicity tab**

```tsx
// File: src/components/park-form/toxicity-tab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

export function ToxicityTab({ data, onChange }: Props) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>Штраф за досрочный возврат (₽)</Label>
        <Input type="number" value={data.earlyReturnPenalty} onChange={(e) => onChange({ earlyReturnPenalty: +e.target.value })} />
      </div>
      <div>
        <Label>Территориальное ограничение (км, 0 = без ограничений)</Label>
        <Input type="number" value={data.territoryLimit} onChange={(e) => onChange({ territoryLimit: +e.target.value })} />
      </div>
      <div>
        <Label>Лимит пробега в сутки (км, 0 = безлимит)</Label>
        <Input type="number" value={data.dailyMileageLimit} onChange={(e) => onChange({ dailyMileageLimit: +e.target.value })} />
      </div>
      <div>
        <Label>Штраф за грязное авто (₽)</Label>
        <Input type="number" value={data.dirtPenalty} onChange={(e) => onChange({ dirtPenalty: +e.target.value })} />
      </div>
      <div>
        <Label>Адекватность руководства (1-10)</Label>
        <Input type="number" min={1} max={10} value={data.managementScore} onChange={(e) => onChange({ managementScore: +e.target.value })} />
      </div>
      <div className="col-span-2">
        <Label>Скрытые комиссии и штрафы</Label>
        <Textarea
          value={data.hiddenFees}
          onChange={(e) => onChange({ hiddenFees: e.target.value })}
          placeholder="Опишите выявленные скрытые платежи..."
          rows={3}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create bonus tab**

```tsx
// File: src/components/park-form/bonus-tab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferFormData } from "./index";

interface Props {
  data: OfferFormData;
  onChange: (patch: Partial<OfferFormData>) => void;
}

export function BonusTab({ data, onChange }: Props) {
  const toggleAggregator = (name: string) => {
    const current = data.aggregators;
    onChange({
      aggregators: current.includes(name)
        ? current.filter((a) => a !== name)
        : [...current, name],
    });
  };

  return (
    <div className="grid gap-4 py-4 md:grid-cols-2">
      <div>
        <Label>Минимальный стаж (лет)</Label>
        <Input type="number" value={data.minExperience} onChange={(e) => onChange({ minExperience: +e.target.value })} />
      </div>
      <div>
        <Label>Гражданство</Label>
        <Select value={data.citizenship} onValueChange={(v) => onChange({ citizenship: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RF">Только РФ</SelectItem>
            <SelectItem value="CIS">РФ + СНГ</SelectItem>
            <SelectItem value="ANY">Любое</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label className="mb-2 block">Агрегаторы</Label>
        <div className="flex gap-4">
          {["yandex", "citimobil", "uber", "indrive", "maxim"].map((agg) => (
            <label key={agg} className="flex items-center gap-2">
              <Checkbox
                checked={data.aggregators.includes(agg)}
                onCheckedChange={() => toggleAggregator(agg)}
              />
              {agg}
            </label>
          ))}
        </div>
      </div>
      <div className="col-span-2 flex flex-wrap gap-6">
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasBranding} onCheckedChange={(v) => onChange({ hasBranding: !!v })} />
          Брендирование
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasChildSeat} onCheckedChange={(v) => onChange({ hasChildSeat: !!v })} />
          Детское кресло
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.ownDevice} onCheckedChange={(v) => onChange({ ownDevice: !!v })} />
          Своё устройство
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.homeStorage} onCheckedChange={(v) => onChange({ homeStorage: !!v })} />
          Домашнее хранение
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={data.hasParking} onCheckedChange={(v) => onChange({ hasParking: !!v })} />
          Парковка для личного авто
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create new park page**

```tsx
// File: src/app/admin/parks/new/page.tsx
import { ParkForm } from "@/components/park-form";

export default function NewParkPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Добавить таксопарк</h2>
      <ParkForm />
    </div>
  );
}
```

- [ ] **Step 10: Create edit park page**

```tsx
// File: src/app/admin/parks/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ParkForm } from "@/components/park-form";

export default async function EditParkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const park = await prisma.taxiPark.findUnique({
    where: { id },
    include: { offers: true },
  });

  if (!park) notFound();

  const offer = park.offers[0]; // Edit first offer for now

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Редактировать: {park.internalName}</h2>
      <ParkForm
        parkId={park.id}
        offerId={offer?.id}
        initial={{
          park: {
            internalName: park.internalName,
            city: park.city,
            auditorComment: park.auditorComment ?? "",
          },
          offer: offer ? { ...offer, hiddenFees: offer.hiddenFees ?? "" } : undefined,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add src/app/admin/parks/ src/components/park-form/
git commit -m "feat: add parks CRUD pages with tabbed form (40+ fields)"
```

---

## Task 13: Admin — Weight Sliders

**Files:**
- Create: `src/components/weight-sliders.tsx`
- Create: `src/app/admin/weights/page.tsx`

- [ ] **Step 1: Create weight sliders component**

```tsx
// File: src/components/weight-sliders.tsx
"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RATING_PARAMS } from "@/lib/rating-params";

interface WeightData {
  paramName: string;
  weight: number;
}

interface Props {
  initialWeights: WeightData[];
}

export function WeightSliders({ initialWeights }: Props) {
  const [weights, setWeights] = useState<WeightData[]>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Array<{ name: string; score: number }> | null>(null);

  const total = weights.reduce((s, w) => s + w.weight, 0);
  const paramLabels = new Map(RATING_PARAMS.map((p) => [p.name, p.label]));

  function updateWeight(paramName: string, value: number) {
    setWeights((prev) =>
      prev.map((w) => (w.paramName === paramName ? { ...w, weight: value } : w))
    );
    setPreview(null);
  }

  async function handlePreview() {
    // Save temporarily and fetch recalculated top-10
    const res = await fetch("/api/weights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });
    if (res.ok) {
      const parksRes = await fetch("/api/parks?city=moscow");
      const parks = await parksRes.json();
      const topOffers = parks
        .flatMap((p: any) =>
          p.offers.map((o: any) => ({
            name: `${p.internalName} (${o.driverClass})`,
            score: o.rating?.totalScore ?? 0,
          }))
        )
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);
      setPreview(topOffers);
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/weights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          Сумма весов: <span className={Math.abs(total - 100) > 0.5 ? "text-red-500" : "text-green-500"}>
            {total.toFixed(1)}%
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {weights.map((w) => (
          <div key={w.paramName} className="grid grid-cols-[200px_1fr_60px] items-center gap-4">
            <Label className="text-sm">{paramLabels.get(w.paramName) ?? w.paramName}</Label>
            <Slider
              value={[w.weight]}
              onValueChange={([v]) => updateWeight(w.paramName, v)}
              max={50}
              step={0.5}
            />
            <span className="text-sm text-right">{w.weight}%</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handlePreview}>
          Предпросмотр топ-10
        </Button>
        <Button onClick={handleSave} disabled={saving || Math.abs(total - 100) > 0.5}>
          {saving ? "Сохранение..." : "Применить"}
        </Button>
      </div>

      {preview && (
        <div className="rounded-md border p-4">
          <h4 className="mb-2 font-medium">Предпросмотр топ-10</h4>
          {preview.map((p, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>{i + 1}. {p.name}</span>
              <span className="font-medium">{p.score.toFixed(1)}/5</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create weights admin page**

```tsx
// File: src/app/admin/weights/page.tsx
import { prisma } from "@/lib/prisma";
import { WeightSliders } from "@/components/weight-sliders";
import { RATING_PARAMS } from "@/lib/rating-params";

export default async function WeightsPage() {
  let weights = await prisma.ratingWeight.findMany({ where: { city: "moscow" } });

  // Seed defaults if empty
  if (weights.length === 0) {
    const defaultWeight = Math.round((100 / RATING_PARAMS.length) * 100) / 100;
    weights = await Promise.all(
      RATING_PARAMS.map((p) =>
        prisma.ratingWeight.create({
          data: { paramName: p.name, weight: defaultWeight, city: "moscow" },
        })
      )
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Настройка весов рейтинга</h2>
      <p className="text-muted-foreground">
        Сумма всех весов должна равняться 100%. При сохранении рейтинги всех парков пересчитываются.
      </p>
      <WeightSliders initialWeights={weights.map((w) => ({ paramName: w.paramName, weight: w.weight }))} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/weight-sliders.tsx src/app/admin/weights/
git commit -m "feat: add rating weight sliders with preview"
```

---

## Task 14: Admin — Moderation Queue

**Files:**
- Create: `src/components/verification-card.tsx`
- Create: `src/app/admin/moderation/page.tsx`

- [ ] **Step 1: Create verification card component**

```tsx
// File: src/components/verification-card.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Props {
  request: {
    id: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      telegramId: string;
      driverClass: string | null;
      experience: number | null;
      photoLicense: string | null;
      photoLicenseBack: string | null;
      photoSelfie: string | null;
    };
  };
  parks: Array<{ id: string; internalName: string }>;
  onProcessed: () => void;
}

const REJECTION_REASONS = [
  "Нечитаемое фото документа",
  "Фото не соответствует требованиям",
  "Стаж менее 3 лет",
  "Документы просрочены",
  "Другая причина",
];

const classLabels: Record<string, string> = {
  ECONOMY: "Эконом", COMFORT: "Комфорт", COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес", MINIVAN: "Минивэн", PREMIUM: "Премиум",
};

export function VerificationCard({ request, parks, onProcessed }: Props) {
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [selectedPark, setSelectedPark] = useState(parks[0]?.id ?? "");

  async function handle(action: "approve" | "reject") {
    setProcessing(true);
    await fetch(`/api/verification/${request.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
        parkId: action === "approve" ? selectedPark : undefined,
      }),
    });
    setProcessing(false);
    onProcessed();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{request.user.name}</span>
          <Badge variant="outline">
            {request.user.driverClass ? classLabels[request.user.driverClass] : "Не указан"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Стаж: {request.user.experience ?? "?"} лет | Telegram: {request.user.telegramId}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {request.user.photoLicense && (
            <img src={request.user.photoLicense} alt="Права (лицо)" className="rounded-md border" />
          )}
          {request.user.photoLicenseBack && (
            <img src={request.user.photoLicenseBack} alt="Права (оборот)" className="rounded-md border" />
          )}
          {request.user.photoSelfie && (
            <img src={request.user.photoSelfie} alt="Селфи с авто" className="rounded-md border" />
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Select value={selectedPark} onValueChange={setSelectedPark}>
              <SelectTrigger><SelectValue placeholder="Рекомендовать парк" /></SelectTrigger>
              <SelectContent>
                {parks.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.internalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => handle("approve")} disabled={processing}>
              Одобрить
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="destructive" className="w-full" onClick={() => handle("reject")} disabled={processing}>
              Отклонить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create moderation page**

```tsx
// File: src/app/admin/moderation/page.tsx
"use client";

import { useEffect, useState } from "react";
import { VerificationCard } from "@/components/verification-card";

export default function ModerationPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [parks, setParks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [reqRes, parksRes] = await Promise.all([
      fetch("/api/verification"),
      fetch("/api/parks"),
    ]);
    setRequests(await reqRes.json());
    setParks(await parksRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        Модерация ({requests.length} в очереди)
      </h2>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">Нет заявок на проверке</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <VerificationCard
              key={r.id}
              request={r}
              parks={parks.map((p: any) => ({ id: p.id, internalName: p.internalName }))}
              onProcessed={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/verification-card.tsx src/app/admin/moderation/
git commit -m "feat: add driver verification moderation queue"
```

---

## Task 15: Driver — Landing Page (Hook)

**Files:**
- Create: `src/components/search-park.tsx`
- Create: `src/components/rating-badge.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create rating badge component**

```tsx
// File: src/components/rating-badge.tsx
interface Props {
  score: number;
  size?: "sm" | "lg";
}

export function RatingBadge({ score, size = "sm" }: Props) {
  const color =
    score >= 4 ? "text-green-500" : score >= 3 ? "text-yellow-500" : "text-red-500";

  if (size === "lg") {
    return (
      <div className={`text-center ${color}`}>
        <div className="text-5xl font-bold">{score.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">из 5</div>
      </div>
    );
  }

  return (
    <span className={`font-semibold ${color}`}>{score.toFixed(1)}</span>
  );
}
```

- [ ] **Step 2: Create park search autocomplete**

```tsx
// File: src/components/search-park.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchPark() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; internalName: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/parks/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setShowDropdown(true);
    }, 300);
  }, [query]);

  function handleSelect(park: { id: string; internalName: string }) {
    setQuery(park.internalName);
    setSelectedId(park.id);
    setShowDropdown(false);
  }

  function handleSubmit() {
    if (selectedId) {
      router.push(`/park/${selectedId}`);
    } else {
      router.push(`/catalog`);
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
          }}
          placeholder="Введите название вашего таксопарка"
          className="text-lg h-12"
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        <Button onClick={handleSubmit} size="lg">
          Проверить
        </Button>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover p-1 shadow-md z-50">
          {results.map((park) => (
            <button
              key={park.id}
              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => handleSelect(park)}
            >
              {park.internalName}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover p-3 shadow-md z-50">
          <p className="text-sm text-muted-foreground">
            Парк не найден. Посмотрите лучшие варианты в каталоге.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create landing page**

```tsx
// File: src/app/page.tsx
import { prisma } from "@/lib/prisma";
import { SearchPark } from "@/components/search-park";
import { RatingBadge } from "@/components/rating-badge";

export default async function LandingPage() {
  // Top 3 parks by rating (names hidden)
  const topOffers = await prisma.rating.findMany({
    orderBy: { totalScore: "desc" },
    take: 3,
    include: {
      parkOffer: {
        select: {
          rentPrice: true,
          deposit: true,
          year: true,
          driverClass: true,
          hasKasko: true,
          freeWash: true,
          homeStorage: true,
        },
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-xl font-bold">ТаксиБрат</h1>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Узнайте правду о вашем таксопарке
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Мы проверяем условия аренды «тайными покупателями» и показываем реальный рейтинг.
            Без рекламы, только факты.
          </p>
          <SearchPark />
        </section>

        {/* Top 3 */}
        {topOffers.length > 0 && (
          <section className="border-t px-4 py-12">
            <h3 className="mb-6 text-center text-xl font-semibold">
              Топ парков с лучшими условиями
            </h3>
            <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-3">
              {topOffers.map((r, i) => {
                const o = r.parkOffer;
                const highlights: string[] = [];
                if (o.rentPrice) highlights.push(`Аренда ${o.rentPrice}₽`);
                if (o.deposit === 0) highlights.push("Без залога");
                if (o.hasKasko) highlights.push("КАСКО");
                if (o.freeWash) highlights.push("Бесплатная мойка");
                if (o.homeStorage) highlights.push("Домашнее хранение");

                return (
                  <div
                    key={r.id}
                    className="rounded-lg border p-4 text-center"
                  >
                    <div className="mb-2 text-sm text-muted-foreground">
                      Парк №{i + 1}
                    </div>
                    <RatingBadge score={r.totalScore} size="lg" />
                    <div className="mt-3 space-y-1 text-sm">
                      {highlights.slice(0, 3).map((h) => (
                        <div key={h} className="text-muted-foreground">{h}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/rating-badge.tsx src/components/search-park.tsx src/app/page.tsx
git commit -m "feat: add landing page with park search and top-3 display"
```

---

## Task 16: Driver — "Bitter Truth" Page

**Files:**
- Create: `src/components/rating-breakdown.tsx`
- Create: `src/app/park/[id]/page.tsx`

- [ ] **Step 1: Create rating breakdown component**

```tsx
// File: src/components/rating-breakdown.tsx
import { RATING_PARAMS } from "@/lib/rating-params";

interface BreakdownEntry {
  raw: number;
  normalized: number;
  weighted: number;
}

interface Props {
  breakdown: Record<string, BreakdownEntry>;
  showOnlyBad?: boolean;
}

const paramLabels = new Map(RATING_PARAMS.map((p) => [p.name, p.label]));

export function RatingBreakdown({ breakdown, showOnlyBad = false }: Props) {
  const entries = Object.entries(breakdown)
    .map(([name, data]) => ({ name, label: paramLabels.get(name) ?? name, ...data }))
    .filter((e) => !showOnlyBad || e.normalized < 0.5)
    .sort((a, b) => a.normalized - b.normalized);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет слабых параметров</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.name} className="flex items-center gap-3">
          <div className="w-48 text-sm truncate">{e.label}</div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${
                  e.normalized >= 0.7
                    ? "bg-green-500"
                    : e.normalized >= 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${e.normalized * 100}%` }}
              />
            </div>
          </div>
          <div className="w-12 text-right text-sm text-muted-foreground">
            {(e.normalized * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create bitter truth page**

```tsx
// File: src/app/park/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RatingBadge } from "@/components/rating-badge";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { Button } from "@/components/ui/button";

export default async function ParkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const park = await prisma.taxiPark.findUnique({
    where: { id },
    include: {
      offers: { include: { rating: true } },
    },
  });

  if (!park) notFound();

  const offer = park.offers[0];
  const rating = offer?.rating;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-xl font-bold">ТаксиБрат</Link>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Ваш таксопарк</h2>
            <p className="text-muted-foreground">Результаты независимого аудита</p>
          </div>

          {rating ? (
            <>
              <div className="flex justify-center py-4">
                <RatingBadge score={rating.totalScore} size="lg" />
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-red-500">
                  Где вы теряете деньги
                </h3>
                <RatingBreakdown
                  breakdown={rating.breakdown as Record<string, any>}
                  showOnlyBad
                />
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950">
                <p className="mb-3 font-medium">
                  Есть парки с рейтингом 4.5+ и лучшими условиями
                </p>
                <Button asChild size="lg">
                  <Link href="/catalog">Показать лучшие варианты</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                У этого парка пока нет рейтинга. Посмотрите лучшие варианты в каталоге.
              </p>
              <Button asChild>
                <Link href="/catalog">Перейти в каталог</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/rating-breakdown.tsx src/app/park/
git commit -m "feat: add bitter truth page with rating breakdown"
```

---

## Task 17: Driver — Catalog Page

**Files:**
- Create: `src/components/park-card.tsx`
- Create: `src/components/filter-bar.tsx`
- Create: `src/app/catalog/page.tsx`

- [ ] **Step 1: Create park card (hidden name)**

```tsx
// File: src/components/park-card.tsx
import Link from "next/link";
import { RatingBadge } from "./rating-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  index: number;
  offer: {
    rentPrice: number;
    year: number;
    driverClass: string;
    deposit: number;
    hasKasko: boolean;
    freeWash: boolean;
    homeStorage: boolean;
    brand: string;
    model: string;
  };
  score: number;
}

const classLabels: Record<string, string> = {
  ECONOMY: "Эконом", COMFORT: "Комфорт", COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес", MINIVAN: "Минивэн", PREMIUM: "Премиум",
};

export function ParkCard({ index, offer, score }: Props) {
  const highlights: string[] = [];
  if (offer.deposit === 0) highlights.push("Без залога");
  if (offer.hasKasko) highlights.push("КАСКО");
  if (offer.freeWash) highlights.push("Бесплатная мойка");
  if (offer.homeStorage) highlights.push("Домашнее хранение");

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <div className="text-center">
        <RatingBadge score={score} size="lg" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Парк №{index}</span>
          <Badge variant="outline">{classLabels[offer.driverClass] ?? offer.driverClass}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {offer.brand} {offer.model}, {offer.year} г. | {offer.rentPrice}₽/сут
          {offer.deposit > 0 ? ` | Залог ${offer.deposit}₽` : " | Без залога"}
        </div>
        <div className="flex flex-wrap gap-1">
          {highlights.map((h) => (
            <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
          ))}
        </div>
      </div>
      <Button asChild>
        <Link href="/auth">Узнать название</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create filter bar**

```tsx
// File: src/components/filter-bar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/catalog?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("class") ?? "all"}
        onValueChange={(v) => update("class", v)}
      >
        <SelectTrigger className="w-36"><SelectValue placeholder="Класс авто" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все классы</SelectItem>
          <SelectItem value="ECONOMY">Эконом</SelectItem>
          <SelectItem value="COMFORT">Комфорт</SelectItem>
          <SelectItem value="COMFORT_PLUS">Комфорт+</SelectItem>
          <SelectItem value="BUSINESS">Бизнес</SelectItem>
          <SelectItem value="MINIVAN">Минивэн</SelectItem>
          <SelectItem value="PREMIUM">Премиум</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Цена от"
        className="w-28"
        defaultValue={searchParams.get("priceFrom") ?? ""}
        onBlur={(e) => update("priceFrom", e.target.value)}
      />
      <Input
        type="number"
        placeholder="Цена до"
        className="w-28"
        defaultValue={searchParams.get("priceTo") ?? ""}
        onBlur={(e) => update("priceTo", e.target.value)}
      />

      <Select
        value={searchParams.get("deposit") ?? "all"}
        onValueChange={(v) => update("deposit", v)}
      >
        <SelectTrigger className="w-36"><SelectValue placeholder="Залог" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой залог</SelectItem>
          <SelectItem value="none">Без залога</SelectItem>
          <SelectItem value="has">С залогом</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        onClick={() => router.push("/catalog")}
      >
        Сбросить
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create catalog page**

```tsx
// File: src/app/catalog/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ParkCard } from "@/components/park-card";
import { FilterBar } from "@/components/filter-bar";
import { Prisma } from "@prisma/client";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const driverClass = params.class;
  const priceFrom = params.priceFrom ? parseInt(params.priceFrom) : undefined;
  const priceTo = params.priceTo ? parseInt(params.priceTo) : undefined;
  const deposit = params.deposit;

  const where: Prisma.ParkOfferWhereInput = {
    park: { isActive: true, city: "moscow" },
    rating: { isNot: null },
    ...(driverClass && driverClass !== "all" && { driverClass: driverClass as any }),
    ...(priceFrom && { rentPrice: { gte: priceFrom } }),
    ...(priceTo && { rentPrice: { ...(priceFrom ? { gte: priceFrom } : {}), lte: priceTo } }),
    ...(deposit === "none" && { deposit: 0 }),
    ...(deposit === "has" && { deposit: { gt: 0 } }),
  };

  const offers = await prisma.parkOffer.findMany({
    where,
    include: { rating: true, park: { select: { id: true } } },
    orderBy: { rating: { totalScore: "desc" } },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-xl font-bold">ТаксиБрат</Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold">Лучшие таксопарки</h2>
          <FilterBar />

          {offers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Нет парков по заданным фильтрам
            </p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer, i) => (
                <ParkCard
                  key={offer.id}
                  index={i + 1}
                  offer={offer}
                  score={offer.rating?.totalScore ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/park-card.tsx src/components/filter-bar.tsx src/app/catalog/
git commit -m "feat: add catalog page with filters and hidden park names"
```

---

## Task 18: Driver — Auth + Verification Pages

**Files:**
- Create: `src/components/telegram-login.tsx`
- Create: `src/components/photo-upload.tsx`
- Create: `src/app/auth/page.tsx`
- Create: `src/app/verify/page.tsx`
- Create: `src/app/verify/status/page.tsx`

- [ ] **Step 1: Create Telegram Login component**

```tsx
// File: src/components/telegram-login.tsx
"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

export function TelegramLogin() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    // Telegram Login Widget callback
    (window as any).onTelegramAuth = (user: any) => {
      signIn("credentials", {
        ...user,
        callbackUrl: "/verify",
      });
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  return <div ref={containerRef} className="flex justify-center" />;
}
```

- [ ] **Step 2: Create photo upload component**

```tsx
// File: src/components/photo-upload.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  type: "license" | "license_back" | "selfie";
  value: string | null;
  onChange: (url: string) => void;
}

export function PhotoUpload({ label, type, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) onChange(data.url);
    setUploading(false);
  }, [type, onChange]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className="h-32 rounded-md border object-cover" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1"
            onClick={() => onChange("")}
          >
            ✕
          </Button>
        </div>
      ) : (
        <label className="flex h-32 cursor-pointer items-center justify-center rounded-md border-2 border-dashed hover:bg-muted/50">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {uploading ? "Загрузка..." : "Нажмите для загрузки"}
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create auth page**

```tsx
// File: src/app/auth/page.tsx
import Link from "next/link";
import { TelegramLogin } from "@/components/telegram-login";

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-xl font-bold">ТаксиБрат</Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h2 className="text-2xl font-bold">Вход</h2>
          <p className="text-muted-foreground">
            Войдите через Telegram, чтобы узнать названия лучших таксопарков
          </p>
          <TelegramLogin />
          <p className="text-xs text-muted-foreground">
            Мы не рассылаем спам. Telegram используется только для авторизации и уведомлений.
          </p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create verification page**

```tsx
// File: src/app/verify/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/photo-upload";

export default function VerifyPage() {
  const router = useRouter();
  const [driverClass, setDriverClass] = useState("ECONOMY");
  const [experience, setExperience] = useState(1);
  const [photoLicense, setPhotoLicense] = useState<string | null>(null);
  const [photoLicenseBack, setPhotoLicenseBack] = useState<string | null>(null);
  const [photoSelfie, setPhotoSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = photoLicense && photoLicenseBack && photoSelfie;

  async function handleSubmit() {
    setSubmitting(true);
    await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverClass,
        experience,
        photoLicense,
        photoLicenseBack,
        photoSelfie,
      }),
    });
    router.push("/verify/status");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-xl font-bold">ТаксиБрат</Link>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Верификация</h2>
            <p className="text-muted-foreground">
              Подтвердите, что вы реальный водитель, чтобы получить контакты лучших парков
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label>В каком классе работаете</Label>
              <Select value={driverClass} onValueChange={setDriverClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ECONOMY">Эконом</SelectItem>
                  <SelectItem value="COMFORT">Комфорт</SelectItem>
                  <SelectItem value="COMFORT_PLUS">Комфорт+</SelectItem>
                  <SelectItem value="BUSINESS">Бизнес</SelectItem>
                  <SelectItem value="MINIVAN">Минивэн</SelectItem>
                  <SelectItem value="PREMIUM">Премиум</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Стаж вождения (лет)</Label>
              <Input
                type="number"
                min={0}
                value={experience}
                onChange={(e) => setExperience(+e.target.value)}
              />
            </div>

            <PhotoUpload label="Права (лицевая сторона)" type="license" value={photoLicense} onChange={setPhotoLicense} />
            <PhotoUpload label="Права (оборотная сторона)" type="license_back" value={photoLicenseBack} onChange={setPhotoLicenseBack} />
            <PhotoUpload label="Селфи с автомобилем" type="selfie" value={photoSelfie} onChange={setPhotoSelfie} />

            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Отправка..." : "Отправить на проверку"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create verification status page**

```tsx
// File: src/app/verify/status/page.tsx
import Link from "next/link";

export default function VerifyStatusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-xl font-bold">ТаксиБрат</Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-sm space-y-4 text-center">
          <div className="text-5xl">📋</div>
          <h2 className="text-2xl font-bold">Документы на проверке</h2>
          <p className="text-muted-foreground">
            Наш менеджер проверит ваши документы и отправит результат в Telegram.
            Обычно это занимает несколько часов.
          </p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Вернуться на главную
          </Link>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/telegram-login.tsx src/components/photo-upload.tsx src/app/auth/ src/app/verify/
git commit -m "feat: add auth, verification, and status pages"
```

---

## Task 19: Root Layout + Final Polish

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

```tsx
// File: src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ТаксиБрат — Честный рейтинг таксопарков",
  description:
    "Сервис-аудитор таксопарков. Проверяем условия аренды авто тайными покупателями. Объективный рейтинг без рекламы.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the app builds**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx prisma generate
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run dev server and smoke-test**

```bash
npm run dev
```

Open `http://localhost:3000` — landing page should render.
Open `http://localhost:3000/catalog` — catalog should render (empty or with seed data).
Open `http://localhost:3000/admin` — should redirect to /auth (not logged in).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update root layout with Russian locale and meta tags"
```

---

## Task 20: Telegram Bot Webhook

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Create webhook handler**

The bot webhook handles `/start` command and serves as the entry point for Telegram interactions. The actual chat happens natively in Telegram — the bot just sends notifications.

```typescript
// File: src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text;

  if (text === "/start") {
    await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          "Добро пожаловать в ТаксиБрат! 🚕\n\n" +
          "Я помогу вам найти честный таксопарк.\n\n" +
          "Перейдите на сайт, чтобы:\n" +
          "• Проверить рейтинг вашего парка\n" +
          "• Найти лучшие условия аренды\n\n" +
          "После верификации я отправлю вам контакты лучшего парка прямо сюда.",
        parse_mode: "HTML",
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Set webhook URL (run once after deploy)**

After deploying to Vercel, run this command to register the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.vercel.app/api/telegram/webhook"}'
```

For local development, use ngrok:

```bash
ngrok http 3000
# Then set webhook to ngrok URL
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telegram/
git commit -m "feat: add Telegram bot webhook with /start command"
```

---

## Task 21: Add .gitignore + .env.example

**Files:**
- Modify: `taxibrat/.gitignore`
- Create: `taxibrat/.env.example`

- [ ] **Step 1: Add .env.example for onboarding**

```bash
# File: taxibrat/.env.example
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""

TELEGRAM_BOT_TOKEN=""
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=""
```

- [ ] **Step 2: Ensure .gitignore includes .env.local**

Verify `.gitignore` contains:

```
.env*.local
```

(create-next-app should have added this already)

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example for onboarding"
```
