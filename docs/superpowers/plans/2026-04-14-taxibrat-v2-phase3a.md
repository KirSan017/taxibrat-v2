# TaxiBrat v2 Phase 3a: Friendship Points + News + Admin Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add friendship points economy with transaction history, key-value admin settings with Redis cache, news system with mass notifications, and refactor existing modules to use configurable point amounts.

**Architecture:** 3 new DB tables (points_transactions, service_settings, news), 3 new NestJS modules (points, settings, news), all @Global for cross-module use. Refactor tickets and users modules to use PointsService instead of direct SQL.

**Tech Stack:** Drizzle ORM (3 tables), NestJS (3 modules), Redis (settings cache)

---

## File Structure

```
packages/shared/src/
├── enums.ts                                    # ADD: PointsTransactionType
├── dto/points.dto.ts                           # NEW
├── dto/settings.dto.ts                         # NEW
├── dto/news.dto.ts                             # NEW
├── index.ts                                    # ADD: re-exports

packages/db/src/
├── schema/points-transactions.ts               # NEW
├── schema/service-settings.ts                  # NEW
├── schema/news.ts                              # NEW
├── client.ts                                   # MODIFY
├── index.ts                                    # MODIFY
├── seed-settings.ts                            # NEW

apps/api/src/modules/
├── settings/
│   ├── settings.module.ts                      # NEW @Global
│   ├── settings.controller.ts                  # NEW
│   └── settings.service.ts                     # NEW
├── points/
│   ├── points.module.ts                        # NEW @Global
│   ├── points.controller.ts                    # NEW
│   ├── points.admin.controller.ts              # NEW
│   └── points.service.ts                       # NEW
├── news/
│   ├── news.module.ts                          # NEW
│   ├── news.controller.ts                      # NEW
│   └── news.service.ts                         # NEW
├── tickets/tickets.service.ts                  # MODIFY: use PointsService
├── users/users.service.ts                      # MODIFY: use PointsService + SettingsService
└── app.module.ts                               # MODIFY: add 3 modules
```

---

## Task 1: Shared Types for Phase 3a

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/dto/points.dto.ts`
- Create: `packages/shared/src/dto/settings.dto.ts`
- Create: `packages/shared/src/dto/news.dto.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Append PointsTransactionType to enums.ts**

```ts
export enum PointsTransactionType {
  REGISTRATION = "REGISTRATION",
  PARK_CHECK = "PARK_CHECK",
  TAXI_CONNECT = "TAXI_CONNECT",
  BUYOUT = "BUYOUT",
  REFERRAL = "REFERRAL",
  ORDER_NO9 = "ORDER_NO9",
  ORDER_CANCEL = "ORDER_CANCEL",
  BASE_CHECK = "BASE_CHECK",
  MANUAL_ADMIN = "MANUAL_ADMIN",
  IDEA = "IDEA",
}
```

- [ ] **Step 2: Create dto/points.dto.ts**

```ts
import { z } from "zod";

export const adjustPointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  description: z.string().min(1).max(300),
});

export const pointsHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AdjustPointsDto = z.infer<typeof adjustPointsSchema>;
export type PointsHistoryDto = z.infer<typeof pointsHistorySchema>;
```

- [ ] **Step 3: Create dto/settings.dto.ts**

```ts
import { z } from "zod";

export const updateSettingsSchema = z.object({
  updates: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string(),
    })
  ).min(1),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
```

- [ ] **Step 4: Create dto/news.dto.ts**

```ts
import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  linkUrl: z.string().url().optional(),
});

export const updateNewsSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  linkUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const listNewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateNewsDto = z.infer<typeof createNewsSchema>;
export type UpdateNewsDto = z.infer<typeof updateNewsSchema>;
export type ListNewsDto = z.infer<typeof listNewsSchema>;
```

- [ ] **Step 5: Add to index.ts**

```ts
export * from "./dto/points.dto";
export * from "./dto/settings.dto";
export * from "./dto/news.dto";
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Phase 3a enums and DTOs for points, settings, news"
```

---

## Task 2: Database Schema — 3 Tables + Seed

**Files:**
- Create: `packages/db/src/schema/points-transactions.ts`
- Create: `packages/db/src/schema/service-settings.ts`
- Create: `packages/db/src/schema/news.ts`
- Create: `packages/db/src/seed-settings.ts`
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create schema/points-transactions.ts**

```ts
import {
  pgTable, uuid, integer, varchar, pgEnum, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tickets } from "./tickets";

export const pointsTransactionTypeEnum = pgEnum("points_transaction_type", [
  "REGISTRATION", "PARK_CHECK", "TAXI_CONNECT", "BUYOUT", "REFERRAL",
  "ORDER_NO9", "ORDER_CANCEL", "BASE_CHECK", "MANUAL_ADMIN", "IDEA",
]);

export const pointsTransactions = pgTable(
  "points_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    type: pointsTransactionTypeEnum("type").notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    relatedTicketId: uuid("related_ticket_id").references(() => tickets.id),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("points_user_idx").on(table.userId),
    index("points_type_idx").on(table.type),
  ]
);
```

- [ ] **Step 2: Create schema/service-settings.ts**

```ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const serviceSettings = pgTable("service_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Create schema/news.ts**

```ts
import {
  pgTable, uuid, varchar, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const news = pgTable(
  "news",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull(),
    linkUrl: varchar("link_url", { length: 500 }),
    isPublished: boolean("is_published").notNull().default(true),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("news_published_idx").on(table.isPublished, table.createdAt)]
);
```

- [ ] **Step 4: Create seed-settings.ts**

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serviceSettings } from "./schema/service-settings";

const DEFAULTS: Array<{ key: string; value: string }> = [
  { key: "points_registration", value: "100" },
  { key: "points_park_check", value: "150" },
  { key: "points_taxi_connect", value: "150" },
  { key: "points_buyout", value: "1000" },
  { key: "points_idea", value: "50" },
  { key: "points_referral_register", value: "200" },
  { key: "points_referral_bonus", value: "100" },
  { key: "points_base_check_cost", value: "50" },
  { key: "points_order_no9_cost", value: "50" },
  { key: "points_order_cancel_cost", value: "15" },
  { key: "no9_enabled", value: "true" },
  { key: "banner_url", value: "" },
  { key: "points_review_enabled", value: "false" },
  { key: "points_review_date", value: "" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding service settings...");
  for (const s of DEFAULTS) {
    await db
      .insert(serviceSettings)
      .values(s)
      .onConflictDoNothing({ target: serviceSettings.key });
  }

  console.log("Settings seed complete.");
  await client.end();
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
```

- [ ] **Step 5: Update client.ts and index.ts**

Add to `packages/db/src/client.ts` imports:
```ts
import * as pointsTransactionsSchema from "./schema/points-transactions";
import * as serviceSettingsSchema from "./schema/service-settings";
import * as newsSchema from "./schema/news";
```
And spread: `...pointsTransactionsSchema, ...serviceSettingsSchema, ...newsSchema,`

Add to `packages/db/src/index.ts`:
```ts
export * from "./schema/points-transactions";
export * from "./schema/service-settings";
export * from "./schema/news";
```

- [ ] **Step 6: Add seed script to packages/db/package.json**

Add: `"db:seed-settings": "tsx src/seed-settings.ts"`

- [ ] **Step 7: Build and commit**

```bash
cd apps/api && npx nest build
git add -A && git commit -m "feat: add Phase 3a database schema — points, settings, news tables"
```

---

## Task 3: Settings Module (@Global)

**Files:**
- Create: `apps/api/src/modules/settings/settings.service.ts`
- Create: `apps/api/src/modules/settings/settings.controller.ts`
- Create: `apps/api/src/modules/settings/settings.module.ts`

- [ ] **Step 1: Create settings.service.ts**

```ts
import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { serviceSettings } from "@taxibrat/db";
import type Redis from "ioredis";

const CACHE_PREFIX = "settings:";
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class SettingsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async get(key: string): Promise<string | null> {
    const cached = await this.redis.get(`${CACHE_PREFIX}${key}`);
    if (cached !== null) return cached;

    const [row] = await this.db
      .select()
      .from(serviceSettings)
      .where(eq(serviceSettings.key, key))
      .limit(1);

    if (!row) return null;

    await this.redis.set(`${CACHE_PREFIX}${key}`, row.value, "EX", CACHE_TTL);
    return row.value;
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const val = await this.get(key);
    if (val === null) return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val === "true";
  }

  async set(key: string, value: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(serviceSettings)
      .where(eq(serviceSettings.key, key))
      .limit(1);

    if (existing) {
      await this.db
        .update(serviceSettings)
        .set({ value })
        .where(eq(serviceSettings.key, key));
    } else {
      await this.db
        .insert(serviceSettings)
        .values({ key, value });
    }

    await this.redis.del(`${CACHE_PREFIX}${key}`);
  }

  async getAll(): Promise<Array<{ key: string; value: string }>> {
    return this.db
      .select({ key: serviceSettings.key, value: serviceSettings.value })
      .from(serviceSettings)
      .orderBy(serviceSettings.key);
  }

  async getPointsConfig() {
    const all = await this.getAll();
    const map = new Map(all.map((s) => [s.key, s.value]));
    return {
      registration: parseInt(map.get("points_registration") ?? "100", 10),
      parkCheck: parseInt(map.get("points_park_check") ?? "150", 10),
      taxiConnect: parseInt(map.get("points_taxi_connect") ?? "150", 10),
      buyout: parseInt(map.get("points_buyout") ?? "1000", 10),
      idea: parseInt(map.get("points_idea") ?? "50", 10),
      referralRegister: parseInt(map.get("points_referral_register") ?? "200", 10),
      referralBonus: parseInt(map.get("points_referral_bonus") ?? "100", 10),
      baseCheckCost: parseInt(map.get("points_base_check_cost") ?? "50", 10),
      orderNo9Cost: parseInt(map.get("points_order_no9_cost") ?? "50", 10),
      orderCancelCost: parseInt(map.get("points_order_cancel_cost") ?? "15", 10),
    };
  }
}
```

- [ ] **Step 2: Create settings.controller.ts**

```ts
import { Controller, Get, Patch, Body, UseGuards, UsePipes } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SettingsService } from "./settings.service";
import { UserRole, updateSettingsSchema, UpdateSettingsDto } from "@taxibrat/shared";

@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @UsePipes(new ZodValidationPipe(updateSettingsSchema))
  async update(@Body() dto: UpdateSettingsDto) {
    for (const { key, value } of dto.updates) {
      await this.settingsService.set(key, value);
    }
    return { success: true };
  }
}
```

- [ ] **Step 3: Create settings.module.ts**

```ts
import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add settings module with key-value store and Redis cache"
```

---

## Task 4: Points Module (@Global)

**Files:**
- Create: `apps/api/src/modules/points/points.service.ts`
- Create: `apps/api/src/modules/points/points.controller.ts`
- Create: `apps/api/src/modules/points/points.admin.controller.ts`
- Create: `apps/api/src/modules/points/points.module.ts`

- [ ] **Step 1: Create points.service.ts**

```ts
import {
  Injectable, Inject, BadRequestException, Logger,
} from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { pointsTransactions, users } from "@taxibrat/db";
import { PointsTransactionType, NotificationType } from "@taxibrat/shared";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { AuditService } from "../audit/audit.service";
import { AuditAction, AuditEntity } from "@taxibrat/shared";

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private auditService: AuditService,
  ) {}

  async award(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    description: string,
    ticketId?: string,
    createdById?: string,
  ) {
    if (amount <= 0) throw new BadRequestException("Award amount must be positive");

    await this.db.insert(pointsTransactions).values({
      userId,
      amount,
      type,
      description,
      relatedTicketId: ticketId,
      createdById,
    });

    await this.db.execute(
      sql`UPDATE users SET friendship_points = friendship_points + ${amount} WHERE id = ${userId}`
    );

    await this.notificationsService.create({
      userId,
      type: NotificationType.POINTS,
      title: "Начислены баллы дружбы",
      body: `+${amount} баллов: ${description}`,
    });
    this.notificationsGateway.pushToUser(userId, { type: "points-update", amount });

    this.logger.log(`Points awarded: ${userId} +${amount} (${type})`);
  }

  async charge(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    description: string,
  ) {
    if (amount <= 0) throw new BadRequestException("Charge amount must be positive");

    const [user] = await this.db
      .select({ friendshipPoints: users.friendshipPoints })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.friendshipPoints < amount) {
      throw new BadRequestException("Недостаточно баллов дружбы");
    }

    await this.db.insert(pointsTransactions).values({
      userId,
      amount: -amount,
      type,
      description,
    });

    await this.db.execute(
      sql`UPDATE users SET friendship_points = friendship_points - ${amount} WHERE id = ${userId}`
    );

    this.logger.log(`Points charged: ${userId} -${amount} (${type})`);
  }

  async manualAdjust(
    adminId: string,
    userId: string,
    amount: number,
    description: string,
  ) {
    if (amount > 0) {
      await this.award(userId, amount, PointsTransactionType.MANUAL_ADMIN, description, undefined, adminId);
    } else if (amount < 0) {
      await this.charge(userId, Math.abs(amount), PointsTransactionType.MANUAL_ADMIN, description);
    }

    await this.auditService.log({
      actorId: adminId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.POINTS,
      entityId: userId,
      newValue: { amount, description },
    });
  }

  async getBalance(userId: string): Promise<number> {
    const [user] = await this.db
      .select({ friendshipPoints: users.friendshipPoints })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.friendshipPoints ?? 0;
  }

  async getHistory(userId: string, page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getLeaderboard(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          friendshipPoints: users.friendshipPoints,
        })
        .from(users)
        .orderBy(desc(users.friendshipPoints))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)`, total: sql<number>`sum(friendship_points)` })
        .from(users),
    ]);

    return {
      data,
      totalUsers: Number(countResult[0].count),
      totalPoints: Number(countResult[0].total),
      page,
      limit,
    };
  }
}
```

- [ ] **Step 2: Create points.controller.ts**

```ts
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PointsService } from "./points.service";
import { pointsHistorySchema, PointsHistoryDto, POINTS } from "@taxibrat/shared";

@Controller("points")
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get("balance")
  async getBalance(@CurrentUser() user: JwtPayload) {
    const balance = await this.pointsService.getBalance(user.sub);
    return { balance, displayBalance: balance + POINTS.DISPLAY_OFFSET };
  }

  @Get("history")
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(pointsHistorySchema)) dto: PointsHistoryDto,
  ) {
    return this.pointsService.getHistory(user.sub, dto.page, dto.limit);
  }
}
```

- [ ] **Step 3: Create points.admin.controller.ts**

```ts
import { Controller, Get, Post, Body, Query, UseGuards, UsePipes } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PointsService } from "./points.service";
import { UserRole, adjustPointsSchema, AdjustPointsDto } from "@taxibrat/shared";

@Controller("admin/points")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PointsAdminController {
  constructor(private pointsService: PointsService) {}

  @Post("adjust")
  @UsePipes(new ZodValidationPipe(adjustPointsSchema))
  adjust(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.pointsService.manualAdjust(user.sub, dto.userId, dto.amount, dto.description);
  }

  @Get("leaderboard")
  getLeaderboard(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.pointsService.getLeaderboard(parseInt(page), Math.min(parseInt(limit), 100));
  }
}
```

- [ ] **Step 4: Create points.module.ts**

```ts
import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PointsController } from "./points.controller";
import { PointsAdminController } from "./points.admin.controller";
import { PointsService } from "./points.service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PointsController, PointsAdminController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add points module with award, charge, history, leaderboard"
```

---

## Task 5: News Module

**Files:**
- Create: `apps/api/src/modules/news/news.service.ts`
- Create: `apps/api/src/modules/news/news.controller.ts`
- Create: `apps/api/src/modules/news/news.module.ts`

- [ ] **Step 1: Create news.service.ts**

```ts
import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { news, users, notifications } from "@taxibrat/db";
import { NotificationType } from "@taxibrat/shared";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class NewsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(title: string, body: string, linkUrl: string | undefined, createdById: string) {
    const [item] = await this.db
      .insert(news)
      .values({ title, body, linkUrl, createdById })
      .returning();

    // Mass-create notifications for all active users
    await this.db.execute(sql`
      INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
      SELECT gen_random_uuid(), id, 'NEWS', ${title}, ${body}, ${`/news/${item.id}`}, false, now()
      FROM users WHERE status = 'ACTIVE'
    `);

    // WS broadcast to all connected clients
    this.notificationsGateway.server?.emit("notification", {
      type: "news",
      newsId: item.id,
      title,
    });

    return item;
  }

  async list(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(news)
        .where(eq(news.isPublished, true))
        .orderBy(desc(news.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(news)
        .where(eq(news.isPublished, true)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async listAdmin(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(news)
        .orderBy(desc(news.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ count: sql<number>`count(*)` }).from(news),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getById(id: string) {
    const [item] = await this.db.select().from(news).where(eq(news.id, id)).limit(1);
    if (!item) throw new NotFoundException("News not found");
    return item;
  }

  async update(id: string, data: { title?: string; body?: string; linkUrl?: string | null; isPublished?: boolean }) {
    await this.getById(id);
    const [updated] = await this.db
      .update(news)
      .set(data)
      .where(eq(news.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.delete(news).where(eq(news.id, id));
    return { success: true };
  }
}
```

- [ ] **Step 2: Create news.controller.ts**

```ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { NewsService } from "./news.service";
import {
  UserRole, createNewsSchema, updateNewsSchema, listNewsSchema,
  CreateNewsDto, UpdateNewsDto, ListNewsDto,
} from "@taxibrat/shared";

@Controller()
export class NewsController {
  constructor(private newsService: NewsService) {}

  // Public
  @Get("news")
  list(@Query(new ZodValidationPipe(listNewsSchema)) dto: ListNewsDto) {
    return this.newsService.list(dto.page, dto.limit);
  }

  @Get("news/:id")
  getById(@Param("id") id: string) {
    return this.newsService.getById(id);
  }

  // Admin
  @Post("admin/news")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createNewsSchema)) dto: CreateNewsDto,
  ) {
    return this.newsService.create(dto.title, dto.body, dto.linkUrl, user.sub);
  }

  @Get("admin/news")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  listAdmin(@Query(new ZodValidationPipe(listNewsSchema)) dto: ListNewsDto) {
    return this.newsService.listAdmin(dto.page, dto.limit);
  }

  @Patch("admin/news/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNewsSchema)) dto: UpdateNewsDto,
  ) {
    return this.newsService.update(id, dto);
  }

  @Delete("admin/news/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.newsService.delete(id);
  }
}
```

- [ ] **Step 3: Create news.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";

@Module({
  imports: [AuthModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add news module with CRUD and mass notification broadcast"
```

---

## Task 6: Refactor Tickets + Users to Use PointsService

**Files:**
- Modify: `apps/api/src/modules/tickets/tickets.service.ts`
- Modify: `apps/api/src/modules/tickets/tickets.module.ts`
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.module.ts`

- [ ] **Step 1: Refactor tickets.service.ts**

In `TicketsService`:
1. Add constructor injection: `private pointsService: PointsService, private settingsService: SettingsService`
2. In `create()` method, after creating ticket, add paid topic charge:
```ts
// After ticket creation, before distribution:
if (dto.topic === "USER_BASE_CHECK") {
  const cost = await this.settingsService.getNumber("points_base_check_cost", 50);
  await this.pointsService.charge(userId, cost, PointsTransactionType.BASE_CHECK, "Проверка по базе таксопарков");
}
```

3. In `approve()` method, replace direct SQL with PointsService:
```ts
// Replace:
//   if (pointsAwarded > 0) {
//     await this.db.execute(sql`UPDATE users SET friendship_points = ...`);
//   }
// With:
if (pointsAwarded > 0) {
  await this.pointsService.award(
    ticket.userId,
    pointsAwarded,
    PointsTransactionType.PARK_CHECK, // or determine from ticket.topic
    `Тикет подтверждён`,
    ticketId,
    smId,
  );
}
```
Remove the direct SQL UPDATE for friendship_points.

4. Add imports: `import { PointsService } from "../points/points.service"` and `import { SettingsService } from "../settings/settings.service"` and `import { PointsTransactionType } from "@taxibrat/shared"`

- [ ] **Step 2: Refactor users.service.ts**

In `UsersService`:
1. Add constructor injection: `private pointsService: PointsService, private settingsService: SettingsService`
2. In `approveUser()`, replace hardcoded points:
```ts
// Replace:
//   friendshipPoints: isFirstApproval ? POINTS.REGISTRATION_BONUS : user.friendshipPoints,
// With:
const [updated] = await this.db
  .update(users)
  .set({ status: UserStatus.ACTIVE, rejectionReason: null })
  .where(eq(users.id, userId))
  .returning();

if (isFirstApproval) {
  const bonus = await this.settingsService.getNumber("points_registration", 100);
  await this.pointsService.award(userId, bonus, PointsTransactionType.REGISTRATION, "Регистрация + заполнение профиля");
}
```

3. Add imports for PointsService, SettingsService, PointsTransactionType

- [ ] **Step 3: Build and test**

```bash
cd apps/api && npx nest build && pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: use PointsService in tickets and users instead of direct SQL"
```

---

## Task 7: Wire Up All Modules + Build

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update app.module.ts**

Add imports:
```ts
import { SettingsModule } from "./modules/settings/settings.module";
import { PointsModule } from "./modules/points/points.module";
import { NewsModule } from "./modules/news/news.module";
```

Add to imports array (BEFORE TicketsModule since tickets now depends on points/settings):
```ts
SettingsModule,
PointsModule,
NewsModule,
```

- [ ] **Step 2: Build and test**

```bash
cd apps/api && npx nest build && pnpm test
```

Expected: Build and all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: wire up Phase 3a modules — settings, points, news"
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Shared enums, DTOs | `feat: add Phase 3a enums and DTOs for points, settings, news` |
| 2 | DB schema — 3 tables + seed | `feat: add Phase 3a database schema — points, settings, news tables` |
| 3 | Settings module (@Global) | `feat: add settings module with key-value store and Redis cache` |
| 4 | Points module (@Global) | `feat: add points module with award, charge, history, leaderboard` |
| 5 | News module | `feat: add news module with CRUD and mass notification broadcast` |
| 6 | Refactor tickets + users | `refactor: use PointsService in tickets and users instead of direct SQL` |
| 7 | Wire up + build | `feat: wire up Phase 3a modules — settings, points, news` |
