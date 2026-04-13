# Data Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Наполнить каталог ТаксиБрат 100+ парками Москвы и МО через агрессивный парсинг трёх источников (Яндекс.Карты, Авито, taxi-msk.ru), с обработкой сырых данных в админ-очереди и ручным мёрджем в основную таблицу.

**Architecture:** Три слоя — парсеры (каждый источник отдельным модулем с общим интерфейсом `Parser`), обработчик (`raw-data-processor.ts` нормализует телефоны, ищет дубликаты, запускает детектор красных флагов), админка (`/admin/raw-data` с очередью, drawer-ом ревью, тремя действиями).

**Tech Stack:** Next.js 16 (App Router), Prisma 7, PostgreSQL (Supabase), TypeScript, cheerio, p-queue, playwright (fallback), Tailwind, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-11-data-collection-design.md`

---

## File Structure

```
taxibrat/
├── prisma/
│   └── schema.prisma                              # Modify: add RawParkData, enums, TaxiPark fields
├── src/
│   ├── lib/
│   │   ├── phone-normalize.ts                     # NEW: normalizePhone(str) → +7XXXXXXXXXX | null
│   │   ├── red-flags-dictionary.ts                # NEW: keyword dictionary
│   │   ├── red-flags-detector.ts                  # NEW: detectRedFlags(text) → RedFlag[]
│   │   ├── raw-data-processor.ts                  # NEW: processRawInput(input, source, sourceUrl)
│   │   ├── parsing-state.ts                       # NEW: in-memory parser state
│   │   └── parsers/
│   │       ├── types.ts                           # NEW: Parser interface, RawParkInput type
│   │       ├── http-client.ts                     # NEW: fetchWithRetry, UA rotation
│   │       ├── yandex-maps.ts                     # NEW: Yandex Maps parser
│   │       ├── avito.ts                           # NEW: Avito parser
│   │       └── taxi-msk.ts                        # NEW: taxi-msk.ru parser
│   ├── scripts/
│   │   ├── parse-yandex.ts                        # NEW: CLI entry
│   │   ├── parse-avito.ts                         # NEW: CLI entry
│   │   ├── parse-catalogs.ts                      # NEW: CLI entry
│   │   └── parse-all.ts                           # NEW: CLI entry (runs all)
│   ├── app/
│   │   ├── api/
│   │   │   └── admin/
│   │   │       ├── parsing/
│   │   │       │   ├── start/route.ts             # NEW: POST start parser
│   │   │       │   └── status/route.ts            # NEW: GET current status
│   │   │       └── raw-data/
│   │   │           ├── route.ts                   # NEW: GET list with filters
│   │   │           └── [id]/
│   │   │               ├── route.ts               # NEW: GET single
│   │   │               ├── merge/route.ts         # NEW: POST create new park
│   │   │               ├── attach/route.ts        # NEW: POST attach to existing
│   │   │               └── reject/route.ts        # NEW: POST reject
│   │   ├── admin/
│   │   │   └── raw-data/
│   │   │       └── page.tsx                       # NEW: admin queue page
│   │   └── catalog/
│   │       └── page.tsx                           # Modify: verification level filter
│   └── components/
│       ├── raw-data-table.tsx                     # NEW: table + filters
│       ├── raw-data-drawer.tsx                    # NEW: side drawer for review
│       ├── parsing-controls.tsx                   # NEW: start buttons + status
│       ├── red-flags-badges.tsx                   # NEW: colored dots
│       └── verification-level-badge.tsx           # NEW: VERIFIED/BASIC/RAW badge
└── __tests__/
    └── lib/
        ├── phone-normalize.test.ts                # NEW
        ├── red-flags-detector.test.ts             # NEW
        └── raw-data-processor.test.ts             # NEW
```

---

## Task 1: Phone Normalization (TDD)

**Files:**
- Create: `taxibrat/src/lib/phone-normalize.ts`
- Create: `taxibrat/__tests__/lib/phone-normalize.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// File: taxibrat/__tests__/lib/phone-normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/phone-normalize";

describe("normalizePhone", () => {
  it("normalizes +7 (495) 123-45-67 to +74951234567", () => {
    expect(normalizePhone("+7 (495) 123-45-67")).toBe("+74951234567");
  });

  it("normalizes 8 (495) 123-45-67 to +74951234567", () => {
    expect(normalizePhone("8 (495) 123-45-67")).toBe("+74951234567");
  });

  it("normalizes 84951234567 to +74951234567", () => {
    expect(normalizePhone("84951234567")).toBe("+74951234567");
  });

  it("normalizes 74951234567 to +74951234567", () => {
    expect(normalizePhone("74951234567")).toBe("+74951234567");
  });

  it("strips spaces and dashes from +74951234567", () => {
    expect(normalizePhone("+7 495 123 45 67")).toBe("+74951234567");
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBe(null);
  });

  it("returns null for non-phone garbage", () => {
    expect(normalizePhone("hello")).toBe(null);
  });

  it("returns null for short numbers", () => {
    expect(normalizePhone("12345")).toBe(null);
  });

  it("returns null for numbers longer than 11 digits (RU)", () => {
    expect(normalizePhone("+7495123456789")).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx vitest run __tests__/lib/phone-normalize.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// File: taxibrat/src/lib/phone-normalize.ts
export function normalizePhone(input: string): string | null {
  if (!input) return null;

  // Extract digits only
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  // Must be Russian 11-digit format
  if (digits.length !== 11) return null;

  // Convert 8XXXXXXXXXX → 7XXXXXXXXXX
  const normalized = digits.startsWith("8")
    ? "7" + digits.slice(1)
    : digits;

  if (!normalized.startsWith("7")) return null;

  return "+" + normalized;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/phone-normalize.test.ts
```

Expected: 9/9 PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/phone-normalize.ts taxibrat/__tests__/lib/phone-normalize.test.ts
git commit -m "feat: add phone normalization utility with tests"
```

---

## Task 2: Red Flags Dictionary & Detector (TDD)

**Files:**
- Create: `taxibrat/src/lib/red-flags-dictionary.ts`
- Create: `taxibrat/src/lib/red-flags-detector.ts`
- Create: `taxibrat/__tests__/lib/red-flags-detector.test.ts`

- [ ] **Step 1: Create dictionary**

```typescript
// File: taxibrat/src/lib/red-flags-dictionary.ts
export type Severity = "HIGH" | "MEDIUM" | "LOW";

export interface DictionaryEntry {
  keyword: string;
  severity: Severity;
}

export const RED_FLAGS_DICTIONARY: DictionaryEntry[] = [
  // HIGH
  { keyword: "залог удерживается", severity: "HIGH" },
  { keyword: "штраф за досрочный возврат", severity: "HIGH" },
  { keyword: "скрытые платежи", severity: "HIGH" },
  { keyword: "обязательная предоплата", severity: "HIGH" },
  { keyword: "залог не возвращается", severity: "HIGH" },
  { keyword: "удержание залога", severity: "HIGH" },
  // MEDIUM
  { keyword: "минимум смен", severity: "MEDIUM" },
  { keyword: "обязательно отработать", severity: "MEDIUM" },
  { keyword: "комиссия за вывод", severity: "MEDIUM" },
  { keyword: "штраф за опоздание", severity: "MEDIUM" },
  { keyword: "штраф за грязное", severity: "MEDIUM" },
  { keyword: "штраф за выезд", severity: "MEDIUM" },
  { keyword: "лимит пробега", severity: "MEDIUM" },
  // LOW
  { keyword: "только через приложение", severity: "LOW" },
  { keyword: "работа от", severity: "LOW" },
  { keyword: "минимальный стаж", severity: "LOW" },
  { keyword: "только гражданство рф", severity: "LOW" },
  { keyword: "без выходных", severity: "LOW" },
];
```

- [ ] **Step 2: Write failing tests for detector**

```typescript
// File: taxibrat/__tests__/lib/red-flags-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectRedFlags } from "@/lib/red-flags-detector";

describe("detectRedFlags", () => {
  it("returns empty array for clean text", () => {
    expect(detectRedFlags("Хороший парк, всё прозрачно")).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(detectRedFlags("")).toEqual([]);
  });

  it("detects HIGH severity keyword", () => {
    const result = detectRedFlags("Внимание: залог удерживается при досрочном возврате");
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe("залог удерживается");
    expect(result[0].severity).toBe("HIGH");
  });

  it("includes surrounding context (50 chars each side)", () => {
    const text = "Мы работаем честно но минимум смен 30 иначе штраф";
    const result = detectRedFlags(text);
    const match = result.find((r) => r.keyword === "минимум смен");
    expect(match).toBeDefined();
    expect(match!.context).toContain("минимум смен");
  });

  it("is case insensitive", () => {
    const result = detectRedFlags("ЗАЛОГ УДЕРЖИВАЕТСЯ");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("HIGH");
  });

  it("detects multiple flags in one text", () => {
    const text = "Залог удерживается, минимум смен 20, комиссия за вывод 3%";
    const result = detectRedFlags(text);
    expect(result.length).toBeGreaterThanOrEqual(3);
    const severities = result.map((r) => r.severity);
    expect(severities).toContain("HIGH");
    expect(severities).toContain("MEDIUM");
  });

  it("does not double-count same keyword appearing once", () => {
    const result = detectRedFlags("залог удерживается");
    expect(result.filter((r) => r.keyword === "залог удерживается")).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx vitest run __tests__/lib/red-flags-detector.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement detector**

```typescript
// File: taxibrat/src/lib/red-flags-detector.ts
import { RED_FLAGS_DICTIONARY, type Severity } from "./red-flags-dictionary";

export interface RedFlag {
  keyword: string;
  context: string;
  severity: Severity;
}

const CONTEXT_WINDOW = 50;

export function detectRedFlags(text: string): RedFlag[] {
  if (!text) return [];

  const lower = text.toLowerCase();
  const results: RedFlag[] = [];
  const seen = new Set<string>();

  for (const entry of RED_FLAGS_DICTIONARY) {
    if (seen.has(entry.keyword)) continue;

    const idx = lower.indexOf(entry.keyword.toLowerCase());
    if (idx === -1) continue;

    const start = Math.max(0, idx - CONTEXT_WINDOW);
    const end = Math.min(text.length, idx + entry.keyword.length + CONTEXT_WINDOW);
    const context = text.slice(start, end).trim();

    results.push({
      keyword: entry.keyword,
      context,
      severity: entry.severity,
    });
    seen.add(entry.keyword);
  }

  return results;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/red-flags-detector.test.ts
```

Expected: 7/7 PASS.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/red-flags-dictionary.ts taxibrat/src/lib/red-flags-detector.ts taxibrat/__tests__/lib/red-flags-detector.test.ts
git commit -m "feat: add red flags dictionary and detector"
```

---

## Task 3: Prisma Schema Changes

**Files:**
- Modify: `taxibrat/prisma/schema.prisma`

- [ ] **Step 1: Add new enums after existing enums**

Add immediately after the `DriverClass` enum (around line 85-90):

```prisma
enum SourceType {
  YANDEX_MAPS
  AVITO
  TAXI_MSK
  TELEGRAM
  OTHER
}

enum RawDataStatus {
  PENDING
  MERGED
  REJECTED
  DUPLICATE
}

enum VerificationLevel {
  RAW
  BASIC
  VERIFIED
}

enum VerificationType {
  DRIVER_VERIFICATION
  PARK_AUDIT_REQUEST
}
```

- [ ] **Step 2: Update TaxiPark model**

Find `model TaxiPark` (line 109). Add three new fields after `isActive`:

```prisma
  isActive          Boolean           @default(true)
  phone             String?           // Normalized +7XXXXXXXXXX for dedup
  verificationLevel VerificationLevel @default(VERIFIED)
  sources           String[]          // URLs from which this park was sourced
```

Also add relation to `RawParkData`:

```prisma
  creator      User           @relation("CreatedByManager", fields: [createdById], references: [id])
  offers       ParkOffer[]
  rawDataLinks RawParkData[]
```

- [ ] **Step 3: Update VerificationRequest model**

Find `model VerificationRequest` (line 212). Add `type` field after `id`:

```prisma
model VerificationRequest {
  id              String             @id @default(cuid())
  type            VerificationType   @default(DRIVER_VERIFICATION)
  userId          String?
```

Change `userId` to optional (PARK_AUDIT_REQUEST may not have a specific user).

Also add new fields for park audit requests:

```prisma
  // ... existing fields ...
  targetParkId    String?            // For PARK_AUDIT_REQUEST
  requestedByIp   String?            // For anonymous park audit requests
```

Update the relation (userId is now optional):

```prisma
  user     User? @relation("UserRequests", fields: [userId], references: [id])
  reviewer User? @relation("ReviewedBy", fields: [reviewedById], references: [id])
```

- [ ] **Step 4: Add RawParkData model**

Add at end of file after `VerificationRequest` model:

```prisma
model RawParkData {
  id       String     @id @default(cuid())
  source   SourceType
  sourceUrl String
  sourceId String?

  parsedAt DateTime @default(now())
  parsedBy String?

  // Base fields
  rawName      String
  phone        String?
  address      String?
  website      String?
  telegramLink String?

  // Offer fields
  rentPrice   Int?
  deposit     Int?
  schedule    String?
  driverClass String?
  brand       String?
  model       String?
  year        Int?
  fuelType    String?

  // Processing
  status          RawDataStatus @default(PENDING)
  mergedToParkId  String?
  mergedToPark    TaxiPark?     @relation(fields: [mergedToParkId], references: [id])
  rejectionReason String?

  // Red flags
  redFlags Json?

  // Raw text
  rawText String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([source])
  @@index([phone])
  @@index([mergedToParkId])
}
```

- [ ] **Step 5: Generate Prisma client**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx prisma generate
```

Expected: `Generated Prisma Client (7.6.0) to ./src/generated/prisma`

- [ ] **Step 6: Push schema to database**

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 7: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds without type errors.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/prisma/schema.prisma
git commit -m "feat: add RawParkData model and verification level fields"
```

---

## Task 4: Parser Types and HTTP Client

**Files:**
- Create: `taxibrat/src/lib/parsers/types.ts`
- Create: `taxibrat/src/lib/parsers/http-client.ts`

- [ ] **Step 1: Define types**

```typescript
// File: taxibrat/src/lib/parsers/types.ts
export type SourceType = "YANDEX_MAPS" | "AVITO" | "TAXI_MSK" | "TELEGRAM" | "OTHER";

export interface RawParkInput {
  source: SourceType;
  sourceUrl: string;
  sourceId?: string;

  rawName: string;
  phone?: string;
  address?: string;
  website?: string;
  telegramLink?: string;

  rentPrice?: number;
  deposit?: number;
  schedule?: string;
  driverClass?: string;
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: string;

  rawText?: string;
}

export interface Parser {
  source: SourceType;
  parse(): AsyncGenerator<RawParkInput>;
}
```

- [ ] **Step 2: Implement HTTP client with UA rotation and retry**

```typescript
// File: taxibrat/src/lib/parsers/http-client.ts
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchWithRetry(
  url: string,
  options: { maxRetries?: number; timeout?: number } = {}
): Promise<string> {
  const { maxRetries = 3, timeout = 15000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        headers: {
          "User-Agent": randomUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status === 503) {
        // Back off exponentially
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.text();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry: unknown error");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 3: Install cheerio and p-queue**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm install cheerio p-queue
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/parsers/ taxibrat/package.json taxibrat/package-lock.json
git commit -m "feat: add parser types and HTTP client with UA rotation"
```

---

## Task 5: Raw Data Processor (TDD)

**Files:**
- Create: `taxibrat/src/lib/raw-data-processor.ts`
- Create: `taxibrat/__tests__/lib/raw-data-processor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// File: taxibrat/__tests__/lib/raw-data-processor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RawParkInput } from "@/lib/parsers/types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    taxiPark: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    rawParkData: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { processRawInput } from "@/lib/raw-data-processor";

describe("processRawInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates PENDING record when no phone match exists", async () => {
    (prisma.taxiPark.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "raw1" });

    const input: RawParkInput = {
      source: "YANDEX_MAPS",
      sourceUrl: "https://yandex.ru/maps/park1",
      rawName: "Test Park",
      phone: "+7 (495) 123-45-67",
      rawText: "Хороший парк",
    };

    await processRawInput(input);

    expect(prisma.taxiPark.findFirst).toHaveBeenCalledWith({
      where: { phone: "+74951234567" },
    });
    expect(prisma.rawParkData.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          phone: "+74951234567",
          redFlags: [],
        }),
      })
    );
  });

  it("creates DUPLICATE record and adds source when phone matches", async () => {
    (prisma.taxiPark.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "park1",
      sources: ["https://other.ru/park1"],
    });
    (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "raw2" });
    (prisma.taxiPark.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const input: RawParkInput = {
      source: "YANDEX_MAPS",
      sourceUrl: "https://yandex.ru/maps/park1",
      rawName: "Test Park",
      phone: "+74951234567",
    };

    await processRawInput(input);

    expect(prisma.rawParkData.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DUPLICATE",
          mergedToParkId: "park1",
        }),
      })
    );
    expect(prisma.taxiPark.update).toHaveBeenCalledWith({
      where: { id: "park1" },
      data: { sources: ["https://other.ru/park1", "https://yandex.ru/maps/park1"] },
    });
  });

  it("does not duplicate sourceUrl if already present", async () => {
    (prisma.taxiPark.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "park1",
      sources: ["https://yandex.ru/maps/park1"],
    });
    (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "raw3" });

    const input: RawParkInput = {
      source: "YANDEX_MAPS",
      sourceUrl: "https://yandex.ru/maps/park1",
      rawName: "Test Park",
      phone: "+74951234567",
    };

    await processRawInput(input);

    expect(prisma.taxiPark.update).not.toHaveBeenCalled();
  });

  it("detects red flags from rawText", async () => {
    (prisma.taxiPark.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "raw4" });

    const input: RawParkInput = {
      source: "AVITO",
      sourceUrl: "https://avito.ru/1",
      rawName: "Park X",
      rawText: "Залог удерживается при досрочном возврате, минимум смен 20",
    };

    await processRawInput(input);

    const callArg = (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.data.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "HIGH" }),
        expect.objectContaining({ severity: "MEDIUM" }),
      ])
    );
  });

  it("skips phone lookup when phone cannot be normalized", async () => {
    (prisma.rawParkData.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "raw5" });

    const input: RawParkInput = {
      source: "TAXI_MSK",
      sourceUrl: "https://taxi-msk.ru/park",
      rawName: "No Phone Park",
      phone: "invalid",
    };

    await processRawInput(input);

    expect(prisma.taxiPark.findFirst).not.toHaveBeenCalled();
    expect(prisma.rawParkData.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          phone: null,
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx vitest run __tests__/lib/raw-data-processor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement processor**

```typescript
// File: taxibrat/src/lib/raw-data-processor.ts
import { prisma } from "./prisma";
import { normalizePhone } from "./phone-normalize";
import { detectRedFlags } from "./red-flags-detector";
import type { RawParkInput } from "./parsers/types";

export async function processRawInput(input: RawParkInput): Promise<void> {
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : null;
  const redFlags = input.rawText ? detectRedFlags(input.rawText) : [];

  let status: "PENDING" | "DUPLICATE" = "PENDING";
  let mergedToParkId: string | null = null;

  if (normalizedPhone) {
    const existing = await prisma.taxiPark.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      status = "DUPLICATE";
      mergedToParkId = existing.id;

      if (!existing.sources.includes(input.sourceUrl)) {
        await prisma.taxiPark.update({
          where: { id: existing.id },
          data: { sources: [...existing.sources, input.sourceUrl] },
        });
      }
    }
  }

  await prisma.rawParkData.create({
    data: {
      source: input.source,
      sourceUrl: input.sourceUrl,
      sourceId: input.sourceId ?? null,
      rawName: input.rawName,
      phone: normalizedPhone,
      address: input.address ?? null,
      website: input.website ?? null,
      telegramLink: input.telegramLink ?? null,
      rentPrice: input.rentPrice ?? null,
      deposit: input.deposit ?? null,
      schedule: input.schedule ?? null,
      driverClass: input.driverClass ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      fuelType: input.fuelType ?? null,
      rawText: input.rawText ?? null,
      redFlags: redFlags as unknown as object,
      status,
      mergedToParkId,
      parsedBy: "cli",
    },
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/raw-data-processor.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/raw-data-processor.ts taxibrat/__tests__/lib/raw-data-processor.test.ts
git commit -m "feat: add raw data processor with dedup and red flag detection"
```

---

## Task 6: Parsing State Module

**Files:**
- Create: `taxibrat/src/lib/parsing-state.ts`

- [ ] **Step 1: Implement in-memory state**

```typescript
// File: taxibrat/src/lib/parsing-state.ts
import type { SourceType } from "./parsers/types";

export interface ParsingState {
  running: boolean;
  source: SourceType | "ALL" | null;
  startedAt: Date | null;
  processed: number;
  errors: number;
  currentUrl: string | null;
  lastError: string | null;
}

const state: ParsingState = {
  running: false,
  source: null,
  startedAt: null,
  processed: 0,
  errors: 0,
  currentUrl: null,
  lastError: null,
};

export function getParsingState(): Readonly<ParsingState> {
  return { ...state };
}

export function startParsing(source: SourceType | "ALL"): boolean {
  if (state.running) return false;
  state.running = true;
  state.source = source;
  state.startedAt = new Date();
  state.processed = 0;
  state.errors = 0;
  state.currentUrl = null;
  state.lastError = null;
  return true;
}

export function stopParsing(): void {
  state.running = false;
  state.source = null;
}

export function trackProcessed(url: string): void {
  state.processed += 1;
  state.currentUrl = url;
}

export function trackError(url: string, error: string): void {
  state.errors += 1;
  state.currentUrl = url;
  state.lastError = error;
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/parsing-state.ts
git commit -m "feat: add in-memory parsing state tracker"
```

---

## Task 7: Yandex Maps Parser

**Files:**
- Create: `taxibrat/src/lib/parsers/yandex-maps.ts`

- [ ] **Step 1: Implement parser**

Yandex Maps doesn't have a simple server-rendered HTML — it requires playwright. For MVP we use a simpler approach: parse the organizations search results page via their public JSON endpoint.

```typescript
// File: taxibrat/src/lib/parsers/yandex-maps.ts
import { fetchWithRetry } from "./http-client";
import type { Parser, RawParkInput } from "./types";

const SEARCH_URL = "https://yandex.ru/maps/api/search?text=таксопарк&lang=ru&rspn=1&lr=213&type=biz";

interface YandexOrg {
  id?: string;
  name?: string;
  phones?: { formatted?: string }[];
  address?: { formattedAddress?: string };
  url?: string;
  urls?: string[];
  description?: string;
}

interface YandexResponse {
  items?: YandexOrg[];
  data?: {
    items?: YandexOrg[];
  };
}

export class YandexMapsParser implements Parser {
  source = "YANDEX_MAPS" as const;

  async *parse(): AsyncGenerator<RawParkInput> {
    try {
      const body = await fetchWithRetry(SEARCH_URL);
      const json: YandexResponse = JSON.parse(body);
      const items: YandexOrg[] = json.data?.items ?? json.items ?? [];

      for (const org of items) {
        if (!org.name) continue;

        const sourceUrl = org.url || `https://yandex.ru/maps/org/${org.id ?? ""}`;
        const phone = org.phones?.[0]?.formatted;
        const address = org.address?.formattedAddress;

        yield {
          source: "YANDEX_MAPS",
          sourceUrl,
          sourceId: org.id,
          rawName: org.name,
          phone,
          address,
          website: org.urls?.[0],
          rawText: org.description,
        };
      }
    } catch (err) {
      console.error("[YandexMapsParser] error:", err);
    }
  }
}
```

Note: Yandex API structure changes frequently. If this fails at runtime, the alternative is playwright-based scraping of `https://yandex.ru/maps/?text=таксопарк&rl=...` — out of scope for this plan, but documented as fallback.

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/parsers/yandex-maps.ts
git commit -m "feat: add Yandex Maps parser (JSON endpoint)"
```

---

## Task 8: Avito Parser

**Files:**
- Create: `taxibrat/src/lib/parsers/avito.ts`

- [ ] **Step 1: Implement parser**

```typescript
// File: taxibrat/src/lib/parsers/avito.ts
import * as cheerio from "cheerio";
import { fetchWithRetry } from "./http-client";
import type { Parser, RawParkInput } from "./types";

const LIST_URL =
  "https://www.avito.ru/moskva/vakansii/voditel_taksi-ASgBAgICAUSSA8gQ";

export class AvitoParser implements Parser {
  source = "AVITO" as const;

  async *parse(): AsyncGenerator<RawParkInput> {
    try {
      const listHtml = await fetchWithRetry(LIST_URL);
      const $list = cheerio.load(listHtml);
      const itemUrls: string[] = [];

      $list('a[data-marker="item-title"]').each((_, el) => {
        const href = $list(el).attr("href");
        if (href) {
          const fullUrl = href.startsWith("http") ? href : `https://www.avito.ru${href}`;
          itemUrls.push(fullUrl);
        }
      });

      // Limit to first 30 to avoid ban
      for (const itemUrl of itemUrls.slice(0, 30)) {
        try {
          const itemHtml = await fetchWithRetry(itemUrl);
          const $ = cheerio.load(itemHtml);

          const rawName = $('h1[data-marker="item-view/title-info"]').text().trim() ||
                          $("h1").first().text().trim();
          const description = $('div[data-marker="item-view/item-description"]').text().trim();
          const priceText = $('span[data-marker="item-view/item-price"]').attr("content") ||
                            $('span[data-marker="item-view/item-price"]').text();
          const rentPrice = priceText ? parseInt(priceText.replace(/\D/g, ""), 10) || undefined : undefined;

          // Avito masks phones — use tel: links if visible
          const phoneHref = $('a[href^="tel:"]').attr("href");
          const phone = phoneHref ? phoneHref.replace("tel:", "") : undefined;

          if (!rawName) continue;

          yield {
            source: "AVITO",
            sourceUrl: itemUrl,
            rawName,
            phone,
            rentPrice,
            rawText: description,
          };
        } catch (err) {
          console.error(`[AvitoParser] item error ${itemUrl}:`, err);
        }
      }
    } catch (err) {
      console.error("[AvitoParser] error:", err);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/parsers/avito.ts
git commit -m "feat: add Avito parser (list + item pages)"
```

---

## Task 9: taxi-msk.ru Parser

**Files:**
- Create: `taxibrat/src/lib/parsers/taxi-msk.ts`

- [ ] **Step 1: Implement parser**

```typescript
// File: taxibrat/src/lib/parsers/taxi-msk.ts
import * as cheerio from "cheerio";
import { fetchWithRetry } from "./http-client";
import type { Parser, RawParkInput } from "./types";

const CATALOG_URL = "https://taxi-msk.ru/catalog/taksoparki/";

export class TaxiMskParser implements Parser {
  source = "TAXI_MSK" as const;

  async *parse(): AsyncGenerator<RawParkInput> {
    try {
      const html = await fetchWithRetry(CATALOG_URL);
      const $ = cheerio.load(html);

      // Common patterns for catalog cards
      const cards = $(".park-card, .catalog-item, article.item").toArray();

      for (const card of cards) {
        const $card = $(card);
        const rawName = $card.find("h2, h3, .title").first().text().trim();
        if (!rawName) continue;

        const address = $card.find(".address, .location").first().text().trim();
        const phone = $card.find('a[href^="tel:"]').attr("href")?.replace("tel:", "");
        const description = $card.find(".description, .excerpt, p").first().text().trim();
        const link = $card.find("a").first().attr("href");
        const sourceUrl = link
          ? link.startsWith("http") ? link : `https://taxi-msk.ru${link}`
          : CATALOG_URL;

        yield {
          source: "TAXI_MSK",
          sourceUrl,
          rawName,
          phone,
          address: address || undefined,
          rawText: description || undefined,
        };
      }
    } catch (err) {
      console.error("[TaxiMskParser] error:", err);
    }
  }
}
```

Note: taxi-msk.ru may not exist or may have different class names. If this parser fails, the admin can still use Yandex and Avito parsers. The structure here is a best-effort template.

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/lib/parsers/taxi-msk.ts
git commit -m "feat: add taxi-msk.ru catalog parser"
```

---

## Task 10: CLI Scripts

**Files:**
- Create: `taxibrat/src/scripts/parse-yandex.ts`
- Create: `taxibrat/src/scripts/parse-avito.ts`
- Create: `taxibrat/src/scripts/parse-catalogs.ts`
- Create: `taxibrat/src/scripts/parse-all.ts`
- Modify: `taxibrat/package.json`

- [ ] **Step 1: Create parse-yandex.ts**

```typescript
// File: taxibrat/src/scripts/parse-yandex.ts
import "dotenv/config";
import { YandexMapsParser } from "../lib/parsers/yandex-maps";
import { processRawInput } from "../lib/raw-data-processor";
import { startParsing, stopParsing, trackProcessed, trackError } from "../lib/parsing-state";

async function main() {
  console.log("[parse:yandex] starting...");
  startParsing("YANDEX_MAPS");

  const parser = new YandexMapsParser();
  let count = 0;

  for await (const input of parser.parse()) {
    try {
      await processRawInput(input);
      trackProcessed(input.sourceUrl);
      count++;
      console.log(`[${count}] ${input.rawName}`);
    } catch (err) {
      trackError(input.sourceUrl, String(err));
      console.error("Error processing:", err);
    }
  }

  stopParsing();
  console.log(`[parse:yandex] done. Processed: ${count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  stopParsing();
  process.exit(1);
});
```

- [ ] **Step 2: Create parse-avito.ts**

```typescript
// File: taxibrat/src/scripts/parse-avito.ts
import "dotenv/config";
import { AvitoParser } from "../lib/parsers/avito";
import { processRawInput } from "../lib/raw-data-processor";
import { startParsing, stopParsing, trackProcessed, trackError } from "../lib/parsing-state";

async function main() {
  console.log("[parse:avito] starting...");
  startParsing("AVITO");

  const parser = new AvitoParser();
  let count = 0;

  for await (const input of parser.parse()) {
    try {
      await processRawInput(input);
      trackProcessed(input.sourceUrl);
      count++;
      console.log(`[${count}] ${input.rawName}`);
    } catch (err) {
      trackError(input.sourceUrl, String(err));
      console.error("Error processing:", err);
    }
  }

  stopParsing();
  console.log(`[parse:avito] done. Processed: ${count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  stopParsing();
  process.exit(1);
});
```

- [ ] **Step 3: Create parse-catalogs.ts**

```typescript
// File: taxibrat/src/scripts/parse-catalogs.ts
import "dotenv/config";
import { TaxiMskParser } from "../lib/parsers/taxi-msk";
import { processRawInput } from "../lib/raw-data-processor";
import { startParsing, stopParsing, trackProcessed, trackError } from "../lib/parsing-state";

async function main() {
  console.log("[parse:catalogs] starting...");
  startParsing("TAXI_MSK");

  const parser = new TaxiMskParser();
  let count = 0;

  for await (const input of parser.parse()) {
    try {
      await processRawInput(input);
      trackProcessed(input.sourceUrl);
      count++;
      console.log(`[${count}] ${input.rawName}`);
    } catch (err) {
      trackError(input.sourceUrl, String(err));
      console.error("Error processing:", err);
    }
  }

  stopParsing();
  console.log(`[parse:catalogs] done. Processed: ${count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  stopParsing();
  process.exit(1);
});
```

- [ ] **Step 4: Create parse-all.ts**

```typescript
// File: taxibrat/src/scripts/parse-all.ts
import "dotenv/config";
import { YandexMapsParser } from "../lib/parsers/yandex-maps";
import { AvitoParser } from "../lib/parsers/avito";
import { TaxiMskParser } from "../lib/parsers/taxi-msk";
import { processRawInput } from "../lib/raw-data-processor";
import { startParsing, stopParsing, trackProcessed, trackError } from "../lib/parsing-state";
import type { Parser } from "../lib/parsers/types";

async function runParser(parser: Parser): Promise<number> {
  let count = 0;
  for await (const input of parser.parse()) {
    try {
      await processRawInput(input);
      trackProcessed(input.sourceUrl);
      count++;
      console.log(`[${parser.source}][${count}] ${input.rawName}`);
    } catch (err) {
      trackError(input.sourceUrl, String(err));
      console.error("Error processing:", err);
    }
  }
  return count;
}

async function main() {
  console.log("[parse:all] starting...");
  startParsing("ALL");

  const parsers: Parser[] = [
    new YandexMapsParser(),
    new AvitoParser(),
    new TaxiMskParser(),
  ];

  let total = 0;
  for (const parser of parsers) {
    const n = await runParser(parser);
    total += n;
  }

  stopParsing();
  console.log(`[parse:all] done. Total: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  stopParsing();
  process.exit(1);
});
```

- [ ] **Step 5: Add scripts to package.json**

Find the `scripts` section in `taxibrat/package.json` and add:

```json
"parse:yandex": "tsx src/scripts/parse-yandex.ts",
"parse:avito": "tsx src/scripts/parse-avito.ts",
"parse:catalogs": "tsx src/scripts/parse-catalogs.ts",
"parse:all": "tsx src/scripts/parse-all.ts"
```

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/scripts/ taxibrat/package.json
git commit -m "feat: add CLI parser scripts"
```

---

## Task 11: Parsing API Routes

**Files:**
- Create: `taxibrat/src/app/api/admin/parsing/start/route.ts`
- Create: `taxibrat/src/app/api/admin/parsing/status/route.ts`

- [ ] **Step 1: Create start route**

```typescript
// File: taxibrat/src/app/api/admin/parsing/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { startParsing, stopParsing, trackProcessed, trackError, getParsingState } from "@/lib/parsing-state";
import { processRawInput } from "@/lib/raw-data-processor";
import { YandexMapsParser } from "@/lib/parsers/yandex-maps";
import { AvitoParser } from "@/lib/parsers/avito";
import { TaxiMskParser } from "@/lib/parsers/taxi-msk";
import type { Parser, SourceType } from "@/lib/parsers/types";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { source } = (await req.json()) as { source: SourceType | "ALL" };

  if (getParsingState().running) {
    return NextResponse.json(
      { error: "Parsing is already running", state: getParsingState() },
      { status: 409 }
    );
  }

  const parsers: Parser[] = [];
  if (source === "YANDEX_MAPS" || source === "ALL") parsers.push(new YandexMapsParser());
  if (source === "AVITO" || source === "ALL") parsers.push(new AvitoParser());
  if (source === "TAXI_MSK" || source === "ALL") parsers.push(new TaxiMskParser());

  if (parsers.length === 0) {
    return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  }

  startParsing(source);

  // Fire-and-forget background execution
  (async () => {
    try {
      for (const parser of parsers) {
        for await (const input of parser.parse()) {
          try {
            await processRawInput(input);
            trackProcessed(input.sourceUrl);
          } catch (err) {
            trackError(input.sourceUrl, String(err));
          }
        }
      }
    } finally {
      stopParsing();
    }
  })();

  return NextResponse.json({ ok: true, state: getParsingState() });
}
```

- [ ] **Step 2: Create status route**

```typescript
// File: taxibrat/src/app/api/admin/parsing/status/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getParsingState } from "@/lib/parsing-state";

export async function GET() {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getParsingState());
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/api/admin/parsing/
git commit -m "feat: add parsing start and status API routes"
```

---

## Task 12: Raw Data API Routes

**Files:**
- Create: `taxibrat/src/app/api/admin/raw-data/route.ts`
- Create: `taxibrat/src/app/api/admin/raw-data/[id]/route.ts`
- Create: `taxibrat/src/app/api/admin/raw-data/[id]/merge/route.ts`
- Create: `taxibrat/src/app/api/admin/raw-data/[id]/attach/route.ts`
- Create: `taxibrat/src/app/api/admin/raw-data/[id]/reject/route.ts`

- [ ] **Step 1: Create list route**

```typescript
// File: taxibrat/src/app/api/admin/raw-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const severity = searchParams.get("severity");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;

  const items = await prisma.rawParkData.findMany({
    where,
    orderBy: { parsedAt: "desc" },
    take: 200,
  });

  // Filter by severity in memory (redFlags is JSON)
  const filtered = severity
    ? items.filter((item) => {
        const flags = (item.redFlags as unknown as Array<{ severity: string }>) ?? [];
        if (severity === "NONE") return flags.length === 0;
        return flags.some((f) => f.severity === severity);
      })
    : items;

  // Counts for header
  const [total, pending, merged, rejected] = await Promise.all([
    prisma.rawParkData.count(),
    prisma.rawParkData.count({ where: { status: "PENDING" } }),
    prisma.rawParkData.count({ where: { status: "MERGED" } }),
    prisma.rawParkData.count({ where: { status: "REJECTED" } }),
  ]);

  return NextResponse.json({
    items: filtered,
    counts: { total, pending, merged, rejected },
  });
}
```

- [ ] **Step 2: Create single item route**

```typescript
// File: taxibrat/src/app/api/admin/raw-data/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.rawParkData.findUnique({
    where: { id },
    include: { mergedToPark: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
```

- [ ] **Step 3: Create merge route (create new park)**

```typescript
// File: taxibrat/src/app/api/admin/raw-data/[id]/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await params;

    const raw = await prisma.rawParkData.findUnique({ where: { id } });
    if (!raw) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const internalName: string = body.internalName ?? raw.rawName;

    // Create TaxiPark
    const park = await prisma.taxiPark.create({
      data: {
        internalName,
        city: body.city ?? "moscow",
        phone: raw.phone,
        auditorComment: body.auditorComment ?? null,
        verificationLevel: "BASIC",
        sources: [raw.sourceUrl],
        createdById: session.user.id,
      },
    });

    // Mark raw as merged
    await prisma.rawParkData.update({
      where: { id },
      data: { status: "MERGED", mergedToParkId: park.id },
    });

    return NextResponse.json({ park });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create attach route**

```typescript
// File: taxibrat/src/app/api/admin/raw-data/[id]/attach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await params;
    const { parkId } = (await req.json()) as { parkId: string };

    const [raw, park] = await Promise.all([
      prisma.rawParkData.findUnique({ where: { id } }),
      prisma.taxiPark.findUnique({ where: { id: parkId } }),
    ]);

    if (!raw) return NextResponse.json({ error: "Raw not found" }, { status: 404 });
    if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });

    const newSources = park.sources.includes(raw.sourceUrl)
      ? park.sources
      : [...park.sources, raw.sourceUrl];

    await prisma.$transaction([
      prisma.taxiPark.update({
        where: { id: parkId },
        data: {
          sources: newSources,
          // Fill missing fields from raw if empty
          phone: park.phone ?? raw.phone,
        },
      }),
      prisma.rawParkData.update({
        where: { id },
        data: { status: "MERGED", mergedToParkId: parkId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create reject route**

```typescript
// File: taxibrat/src/app/api/admin/raw-data/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await params;
    const { reason } = (await req.json()) as { reason: string };

    await prisma.rawParkData.update({
      where: { id },
      data: { status: "REJECTED", rejectionReason: reason || "Rejected by admin" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/api/admin/raw-data/
git commit -m "feat: add raw data API routes (list, merge, attach, reject)"
```

---

## Task 13: Admin UI — Components

**Files:**
- Create: `taxibrat/src/components/red-flags-badges.tsx`
- Create: `taxibrat/src/components/verification-level-badge.tsx`
- Create: `taxibrat/src/components/parsing-controls.tsx`

- [ ] **Step 1: Red flags badges**

```typescript
// File: taxibrat/src/components/red-flags-badges.tsx
"use client";

interface RedFlag {
  keyword: string;
  context: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface Props {
  flags: RedFlag[] | null | undefined;
}

export function RedFlagsBadges({ flags }: Props) {
  if (!flags || flags.length === 0) {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  const counts = {
    HIGH: flags.filter((f) => f.severity === "HIGH").length,
    MEDIUM: flags.filter((f) => f.severity === "MEDIUM").length,
    LOW: flags.filter((f) => f.severity === "LOW").length,
  };

  return (
    <div className="flex gap-1.5">
      {counts.HIGH > 0 && (
        <span
          title={`${counts.HIGH} высоких`}
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {counts.HIGH}
        </span>
      )}
      {counts.MEDIUM > 0 && (
        <span
          title={`${counts.MEDIUM} средних`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {counts.MEDIUM}
        </span>
      )}
      {counts.LOW > 0 && (
        <span
          title={`${counts.LOW} низких`}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          {counts.LOW}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verification level badge**

```typescript
// File: taxibrat/src/components/verification-level-badge.tsx
interface Props {
  level: "RAW" | "BASIC" | "VERIFIED";
}

export function VerificationLevelBadge({ level }: Props) {
  if (level === "VERIFIED") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Верифицирован
      </span>
    );
  }
  if (level === "BASIC") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        Базовые данные
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
      Нужна верификация
    </span>
  );
}
```

- [ ] **Step 3: Parsing controls**

```typescript
// File: taxibrat/src/components/parsing-controls.tsx
"use client";

import { useState, useEffect } from "react";

interface ParsingState {
  running: boolean;
  source: string | null;
  processed: number;
  errors: number;
  currentUrl: string | null;
  lastError: string | null;
}

export function ParsingControls() {
  const [state, setState] = useState<ParsingState | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const poll = async () => {
      const res = await fetch("/api/admin/parsing/status");
      if (res.ok) {
        const data: ParsingState = await res.json();
        setState(data);
        if (data.running) {
          timer = setTimeout(poll, 5000);
        }
      }
    };

    poll();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [starting]);

  async function start(source: string) {
    setStarting(true);
    try {
      await fetch("/api/admin/parsing/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
    } finally {
      setTimeout(() => setStarting(false), 1000);
    }
  }

  const running = state?.running;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900">Парсинг источников</h3>
        {running && (
          <span className="text-xs font-medium text-amber-600">
            Запущен: {state.source} — обработано {state.processed}, ошибок {state.errors}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => start("YANDEX_MAPS")}
          disabled={running || starting}
          className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-900 font-semibold text-sm px-5 py-2 transition-colors"
        >
          Яндекс.Карты
        </button>
        <button
          onClick={() => start("AVITO")}
          disabled={running || starting}
          className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-900 font-semibold text-sm px-5 py-2 transition-colors"
        >
          Авито
        </button>
        <button
          onClick={() => start("TAXI_MSK")}
          disabled={running || starting}
          className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-900 font-semibold text-sm px-5 py-2 transition-colors"
        >
          Каталоги
        </button>
        <button
          onClick={() => start("ALL")}
          disabled={running || starting}
          className="rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold text-sm px-5 py-2 transition-colors"
        >
          Запустить все
        </button>
      </div>
      {state?.lastError && (
        <div className="mt-3 text-xs text-red-600">
          Последняя ошибка: {state.lastError}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/components/red-flags-badges.tsx taxibrat/src/components/verification-level-badge.tsx taxibrat/src/components/parsing-controls.tsx
git commit -m "feat: add raw data UI components (badges, parsing controls)"
```

---

## Task 14: Raw Data Drawer and Table

**Files:**
- Create: `taxibrat/src/components/raw-data-drawer.tsx`
- Create: `taxibrat/src/components/raw-data-table.tsx`

- [ ] **Step 1: Create drawer**

```typescript
// File: taxibrat/src/components/raw-data-drawer.tsx
"use client";

import { useState } from "react";

interface RawItem {
  id: string;
  source: string;
  sourceUrl: string;
  rawName: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rentPrice: number | null;
  deposit: number | null;
  driverClass: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  rawText: string | null;
  redFlags: Array<{ keyword: string; context: string; severity: string }> | null;
  status: string;
}

interface Props {
  item: RawItem | null;
  onClose: () => void;
  onAction: () => void;
}

export function RawDataDrawer({ item, onClose, onAction }: Props) {
  const [loading, setLoading] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  if (!item) return null;

  async function createPark() {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/raw-data/${item.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalName: item.rawName }),
      });
      if (res.ok) {
        onAction();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!item) return;
    const reason = prompt("Причина отклонения:");
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/raw-data/${item.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        onAction();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-xl text-zinc-900">{item.rawName}</h2>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 hover:underline"
              >
                {item.source} — открыть источник
              </a>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <dl className="space-y-3 text-sm">
            {item.phone && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase">Телефон</dt>
                <dd className="text-zinc-900">{item.phone}</dd>
              </div>
            )}
            {item.address && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase">Адрес</dt>
                <dd className="text-zinc-900">{item.address}</dd>
              </div>
            )}
            {item.rentPrice && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase">Цена аренды</dt>
                <dd className="text-zinc-900">{item.rentPrice.toLocaleString("ru-RU")} &#8381;</dd>
              </div>
            )}
            {item.driverClass && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase">Класс</dt>
                <dd className="text-zinc-900">{item.driverClass}</dd>
              </div>
            )}
            {(item.brand || item.model) && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase">Авто</dt>
                <dd className="text-zinc-900">
                  {item.brand} {item.model} {item.year && `(${item.year})`}
                </dd>
              </div>
            )}
          </dl>

          {item.redFlags && item.redFlags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase">Красные флаги</h3>
              {item.redFlags.map((flag, i) => (
                <div key={i} className="rounded-xl bg-red-50 p-3 text-xs">
                  <div className="font-semibold text-red-700">
                    [{flag.severity}] {flag.keyword}
                  </div>
                  <div className="text-red-600 mt-1 italic">&ldquo;{flag.context}&rdquo;</div>
                </div>
              ))}
            </div>
          )}

          {item.rawText && (
            <div>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-xs font-semibold text-zinc-500 uppercase hover:text-zinc-900"
              >
                {showRawText ? "Скрыть" : "Показать"} сырой текст
              </button>
              {showRawText && (
                <pre className="mt-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                  {item.rawText}
                </pre>
              )}
            </div>
          )}

          {item.status === "PENDING" && (
            <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100">
              <button
                onClick={createPark}
                disabled={loading}
                className="rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold px-5 py-2.5 disabled:opacity-50"
              >
                Создать новый парк
              </button>
              <button
                onClick={reject}
                disabled={loading}
                className="rounded-full bg-white border border-red-200 hover:bg-red-50 text-red-700 font-semibold px-5 py-2.5 disabled:opacity-50"
              >
                Отклонить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create table**

```typescript
// File: taxibrat/src/components/raw-data-table.tsx
"use client";

import { useState, useEffect } from "react";
import { RawDataDrawer } from "./raw-data-drawer";
import { RedFlagsBadges } from "./red-flags-badges";

interface RawItem {
  id: string;
  source: string;
  sourceUrl: string;
  rawName: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rentPrice: number | null;
  deposit: number | null;
  driverClass: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  rawText: string | null;
  redFlags: Array<{ keyword: string; context: string; severity: "HIGH" | "MEDIUM" | "LOW" }> | null;
  status: string;
  parsedAt: string;
}

interface Counts {
  total: number;
  pending: number;
  merged: number;
  rejected: number;
}

export function RawDataTable() {
  const [items, setItems] = useState<RawItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, merged: 0, rejected: 0 });
  const [selected, setSelected] = useState<RawItem | null>(null);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [filterSource, setFilterSource] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSource) params.set("source", filterSource);

    const res = await fetch(`/api/admin/raw-data?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setCounts(data.counts);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterSource]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-zinc-500">Всего</div>
          <div className="font-bold text-2xl text-zinc-900">{counts.total}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-zinc-500">На ревью</div>
          <div className="font-bold text-2xl text-amber-600">{counts.pending}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-zinc-500">Объединено</div>
          <div className="font-bold text-2xl text-emerald-600">{counts.merged}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-zinc-500">Отклонено</div>
          <div className="font-bold text-2xl text-zinc-500">{counts.rejected}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-full bg-white border border-zinc-200 px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="PENDING">На ревью</option>
          <option value="MERGED">Объединено</option>
          <option value="REJECTED">Отклонено</option>
          <option value="DUPLICATE">Дубликаты</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="rounded-full bg-white border border-zinc-200 px-4 py-2 text-sm"
        >
          <option value="">Все источники</option>
          <option value="YANDEX_MAPS">Яндекс.Карты</option>
          <option value="AVITO">Авито</option>
          <option value="TAXI_MSK">taxi-msk.ru</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Источник</th>
              <th className="px-4 py-3 text-left">Телефон</th>
              <th className="px-4 py-3 text-left">Цена</th>
              <th className="px-4 py-3 text-left">Флаги</th>
              <th className="px-4 py-3 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Нет записей
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="border-t border-zinc-100 cursor-pointer hover:bg-amber-50/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-zinc-900 truncate max-w-[200px]">
                  {item.rawName}
                </td>
                <td className="px-4 py-3 text-zinc-600">{item.source}</td>
                <td className="px-4 py-3 text-zinc-600">{item.phone ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {item.rentPrice ? `${item.rentPrice.toLocaleString("ru-RU")} ₽` : "—"}
                </td>
                <td className="px-4 py-3">
                  <RedFlagsBadges flags={item.redFlags} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-zinc-600">{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RawDataDrawer item={selected} onClose={() => setSelected(null)} onAction={load} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/components/raw-data-drawer.tsx taxibrat/src/components/raw-data-table.tsx
git commit -m "feat: add raw data drawer and table components"
```

---

## Task 15: Admin Page `/admin/raw-data`

**Files:**
- Create: `taxibrat/src/app/admin/raw-data/page.tsx`
- Modify: `taxibrat/src/app/admin/layout.tsx` (add nav link)

- [ ] **Step 1: Create page**

```typescript
// File: taxibrat/src/app/admin/raw-data/page.tsx
import { Particles } from "@/components/particles";
import { ParsingControls } from "@/components/parsing-controls";
import { RawDataTable } from "@/components/raw-data-table";

export default function RawDataPage() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 p-6">
        <Particles />
        <div className="relative z-10">
          <h1 className="font-[var(--font-montserrat)] text-2xl font-bold text-white">
            Сырые данные
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Очередь спарсенных парков для ревью
          </p>
        </div>
      </div>

      <ParsingControls />
      <RawDataTable />
    </div>
  );
}
```

- [ ] **Step 2: Add nav link to admin layout**

Find `src/app/admin/layout.tsx` and locate the nav links array/section. Add a new link:

```tsx
<Link
  href="/admin/raw-data"
  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
>
  Сырые данные
</Link>
```

Place it after the "Парки" link in the sidebar navigation.

- [ ] **Step 3: Verify build**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/admin/raw-data/ taxibrat/src/app/admin/layout.tsx
git commit -m "feat: add /admin/raw-data page with sidebar link"
```

---

## Task 16: Catalog Filter for Verification Level

**Files:**
- Modify: `taxibrat/src/app/catalog/page.tsx`
- Modify: `taxibrat/src/components/park-card.tsx`
- Modify: `taxibrat/src/components/filter-bar.tsx`

- [ ] **Step 1: Update filter bar**

Find `src/components/filter-bar.tsx` and add a new filter group for verification level. Locate where class/price filters are rendered and add after:

```tsx
<div className="flex gap-2 flex-wrap">
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={searchParams.get("verified") !== "0"}
      onChange={(e) => updateParam("verified", e.target.checked ? "1" : "0")}
      className="rounded border-zinc-300"
    />
    Верифицированы
  </label>
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={searchParams.get("basic") !== "0"}
      onChange={(e) => updateParam("basic", e.target.checked ? "1" : "0")}
      className="rounded border-zinc-300"
    />
    Базовые данные
  </label>
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={searchParams.get("raw") === "1"}
      onChange={(e) => updateParam("raw", e.target.checked ? "1" : "0")}
      className="rounded border-zinc-300"
    />
    Только парсинг
  </label>
</div>
```

Note: if `filter-bar.tsx` does not already have an `updateParam` helper, add one that updates URLSearchParams and pushes to the router.

- [ ] **Step 2: Update catalog page query**

Find `src/app/catalog/page.tsx` and locate the Prisma query for parks. Update the `where` clause to include verification level filter based on searchParams.

After reading the existing `searchParams`, build a list of allowed levels:

```typescript
const allowedLevels: Array<"VERIFIED" | "BASIC" | "RAW"> = [];
if (searchParams.verified !== "0") allowedLevels.push("VERIFIED");
if (searchParams.basic !== "0") allowedLevels.push("BASIC");
if (searchParams.raw === "1") allowedLevels.push("RAW");

// If nothing selected, default to VERIFIED + BASIC
if (allowedLevels.length === 0) {
  allowedLevels.push("VERIFIED", "BASIC");
}
```

Then add `park: { verificationLevel: { in: allowedLevels } }` to the existing `where` clause of the offer query.

- [ ] **Step 3: Update park card to show badge**

Find `src/components/park-card.tsx`. Add `verificationLevel` to the props:

```typescript
interface Props {
  // ... existing props ...
  verificationLevel: "RAW" | "BASIC" | "VERIFIED";
}
```

Import and render the badge near the park name:

```tsx
import { VerificationLevelBadge } from "./verification-level-badge";

// ... in JSX, near the park name:
<div className="flex items-center gap-2">
  <div className="font-semibold text-zinc-900">Парк №{index}</div>
  <VerificationLevelBadge level={verificationLevel} />
</div>
```

For RAW parks, replace the "Узнать название" button with "Запросить проверку" that POSTs to a new endpoint (Task 17).

- [ ] **Step 4: Verify build**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/catalog/page.tsx taxibrat/src/components/filter-bar.tsx taxibrat/src/components/park-card.tsx
git commit -m "feat: add verification level filter and badge to catalog"
```

---

## Task 17: Park Audit Request API and Button

**Files:**
- Create: `taxibrat/src/app/api/park-audit-request/route.ts`
- Modify: `taxibrat/src/components/park-card.tsx`

- [ ] **Step 1: Create audit request route**

```typescript
// File: taxibrat/src/app/api/park-audit-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { parkId } = (await req.json()) as { parkId: string };

  if (!parkId) {
    return NextResponse.json({ error: "parkId is required" }, { status: 400 });
  }

  const park = await prisma.taxiPark.findUnique({ where: { id: parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const session = await getSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  await prisma.verificationRequest.create({
    data: {
      type: "PARK_AUDIT_REQUEST",
      userId: session?.user.id ?? null,
      targetParkId: parkId,
      requestedByIp: ip,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add request button in park card**

In `src/components/park-card.tsx`, add a handler for RAW parks:

```tsx
"use client";

import { useState } from "react";

// ... inside component, if verificationLevel === "RAW":
const [requested, setRequested] = useState(false);

async function requestAudit() {
  const res = await fetch("/api/park-audit-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parkId }),
  });
  if (res.ok) setRequested(true);
}

// In JSX:
{verificationLevel === "RAW" ? (
  <button
    onClick={requestAudit}
    disabled={requested}
    className="rounded-full bg-zinc-100 hover:bg-amber-100 text-zinc-700 font-semibold text-sm px-5 py-2 transition-colors disabled:bg-emerald-50 disabled:text-emerald-700"
  >
    {requested ? "Заявка отправлена" : "Запросить проверку"}
  </button>
) : (
  <Link
    href="/auth"
    className="rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold text-sm px-5 py-2 transition-colors"
  >
    Узнать название
  </Link>
)}
```

Note: park-card.tsx needs to become a client component (add `"use client"` at top) since it now has state. Also needs to accept `parkId` as prop.

- [ ] **Step 3: Verify build**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/api/park-audit-request/ taxibrat/src/components/park-card.tsx
git commit -m "feat: add park audit request flow for RAW parks"
```

---

## Task 18: Landing Page Counter

**Files:**
- Modify: `taxibrat/src/app/page.tsx`

- [ ] **Step 1: Add counter query and display**

In the existing `async function getTop3()` section or near it, add a new counts query:

```typescript
async function getVerificationCounts() {
  const [verified, basicAndRaw] = await Promise.all([
    prisma.taxiPark.count({
      where: { isActive: true, verificationLevel: "VERIFIED" },
    }),
    prisma.taxiPark.count({
      where: { isActive: true, verificationLevel: { in: ["BASIC", "RAW"] } },
    }),
  ]);
  return { verified, basicAndRaw };
}
```

In the component, load and display it above the Top-3 section:

```tsx
const counts = await getVerificationCounts();

// ... in JSX, before <h2>Топ парков этого месяца</h2>:
<div className="text-center text-sm text-zinc-500">
  В каталоге: <span className="font-semibold text-zinc-900">{counts.verified}</span>{" "}
  проверенных,{" "}
  <span className="font-semibold text-zinc-900">{counts.basicAndRaw}+</span> на очереди
</div>
```

- [ ] **Step 2: Verify build**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Professional/Projects/Taxi
git add taxibrat/src/app/page.tsx
git commit -m "feat: add verification counts to landing page"
```

---

## Task 19: End-to-End Smoke Test

**Files:**
- None (manual verification)

- [ ] **Step 1: Run all unit tests**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npx vitest run
```

Expected: All tests pass (phone-normalize, red-flags-detector, raw-data-processor).

- [ ] **Step 2: Run CLI parser locally**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
npm run parse:yandex
```

Expected: Console output with processed park names. No crashes.

If Yandex parser fails (HTML structure changed), this is expected — verify Avito instead:

```bash
npm run parse:avito
```

- [ ] **Step 3: Verify raw data in DB**

Use Prisma Studio or a direct query to confirm records exist:

```bash
npx prisma studio
```

Open `RawParkData` table — should see rows with `status=PENDING` and some `redFlags` populated.

- [ ] **Step 4: Test admin UI locally**

```bash
npm run dev
```

Open `http://localhost:3000/admin/raw-data`:
- Log in as ADMIN (use dev-login)
- Verify counters show correct numbers
- Click a row — drawer opens with all fields
- Click "Создать новый парк" — new TaxiPark created, row disappears from PENDING

- [ ] **Step 5: Deploy to Railway**

```bash
cd C:/Users/Professional/Projects/Taxi/taxibrat
railway up
```

Wait for deploy, then verify:
- `/admin/raw-data` loads without errors
- Parser start button triggers background task
- Status polling updates every 5 seconds

- [ ] **Step 6: Commit any fixes if needed**

```bash
cd C:/Users/Professional/Projects/Taxi
git add -A
git commit -m "fix: smoke test adjustments"
```
