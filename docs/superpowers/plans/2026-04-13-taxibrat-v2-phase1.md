# TaxiBrat v2 Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Turborepo monorepo with NestJS API, Next.js frontend, Drizzle DB, auth (SMS + Telegram), user profiles with verification, roles, notifications (real-time via Socket.IO), audit log, and Docker Compose deployment.

**Architecture:** Monorepo with 2 apps (api, web) and 3 packages (shared, db, config). API is the single source of truth — frontend never accesses DB directly. All state changes logged via audit interceptor.

**Tech Stack:** Turborepo, pnpm, NestJS 11, Next.js 16, Drizzle ORM, PostgreSQL 17, Redis 7, Socket.IO, Passport.js + JWT, Docker Compose, Nginx

---

## File Structure

```
taxibrat-v2/
├── package.json                          # root workspace config
├── pnpm-workspace.yaml                   # pnpm workspace definition
├── turbo.json                            # Turborepo pipeline config
├── .gitignore
├── .env.example
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   └── env.validation.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── auditable.decorator.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── audit.interceptor.ts
│   │   │   │   └── pipes/
│   │   │   │       └── zod-validation.pipe.ts
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       │   ├── auth.module.ts
│   │   │       │   ├── auth.controller.ts
│   │   │       │   ├── auth.service.ts
│   │   │       │   ├── auth.service.spec.ts
│   │   │       │   ├── jwt.strategy.ts
│   │   │       │   └── providers/
│   │   │       │       ├── exolve.provider.ts
│   │   │       │       └── telegram.provider.ts
│   │   │       ├── users/
│   │   │       │   ├── users.module.ts
│   │   │       │   ├── users.controller.ts
│   │   │       │   ├── users.service.ts
│   │   │       │   ├── users.service.spec.ts
│   │   │       │   └── users.admin.controller.ts
│   │   │       ├── managers/
│   │   │       │   ├── managers.module.ts
│   │   │       │   ├── managers.controller.ts
│   │   │       │   └── managers.service.ts
│   │   │       ├── notifications/
│   │   │       │   ├── notifications.module.ts
│   │   │       │   ├── notifications.controller.ts
│   │   │       │   ├── notifications.service.ts
│   │   │       │   └── notifications.gateway.ts
│   │   │       ├── audit/
│   │   │       │   ├── audit.module.ts
│   │   │       │   ├── audit.controller.ts
│   │   │       │   └── audit.service.ts
│   │   │       └── health/
│   │   │           ├── health.module.ts
│   │   │           └── health.controller.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── verify/page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── profile/page.tsx
│       │   │   │   └── layout.tsx
│       │   │   └── admin/
│       │   │       ├── layout.tsx
│       │   │       ├── users/page.tsx
│       │   │       └── audit/page.tsx
│       │   ├── components/
│       │   │   └── ui/               # shadcn components
│       │   └── lib/
│       │       ├── api-client.ts
│       │       ├── auth.ts
│       │       └── socket.ts
│       └── public/
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── enums.ts
│   │       ├── dto/
│   │       │   ├── auth.dto.ts
│   │       │   ├── user.dto.ts
│   │       │   └── notification.dto.ts
│   │       └── constants.ts
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       ├── schema/
│   │       │   ├── users.ts
│   │       │   ├── sessions.ts
│   │       │   ├── verification-codes.ts
│   │       │   ├── manager-settings.ts
│   │       │   ├── audit-log.ts
│   │       │   └── notifications.ts
│   │       └── migrate.ts
│   └── config/
│       ├── package.json
│       ├── tsconfig.base.json
│       └── eslint.base.js
└── docker/
    ├── docker-compose.yml
    ├── docker-compose.dev.yml
    ├── Dockerfile.api
    ├── Dockerfile.web
    └── nginx.conf
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `taxibrat-v2/package.json`
- Create: `taxibrat-v2/pnpm-workspace.yaml`
- Create: `taxibrat-v2/turbo.json`
- Create: `taxibrat-v2/.gitignore`
- Create: `taxibrat-v2/.env.example`
- Create: `taxibrat-v2/packages/config/package.json`
- Create: `taxibrat-v2/packages/config/tsconfig.base.json`
- Create: `taxibrat-v2/packages/config/eslint.base.js`

- [ ] **Step 1: Create project directory and root package.json**

```bash
mkdir -p /c/Users/Professional/Projects/Taxi/taxibrat-v2
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
```

Create `package.json`:
```json
{
  "name": "taxibrat-v2",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:push": "turbo db:push"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@10.8.0",
  "engines": {
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.next/
.turbo/
*.env
!.env.example
.DS_Store
```

- [ ] **Step 5: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://taxibrat:taxibrat@localhost:5432/taxibrat

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-me-in-production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=90d

# Exolve SMS
EXOLVE_API_KEY=
EXOLVE_SENDER=

# Telegram Gateway
TELEGRAM_BOT_TOKEN=
TELEGRAM_GATEWAY_TOKEN=

# App
API_PORT=3000
WEB_PORT=3001
NODE_ENV=development
```

- [ ] **Step 6: Create packages/config/**

Create `packages/config/package.json`:
```json
{
  "name": "@taxibrat/config",
  "private": true,
  "version": "0.0.0"
}
```

Create `packages/config/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

Create `packages/config/eslint.base.js`:
```js
module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
```

- [ ] **Step 7: Initialize git and install dependencies**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
git init
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with Turborepo + pnpm"
```

---

## Task 2: Shared Package (Types, DTOs, Constants)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/dto/auth.dto.ts`
- Create: `packages/shared/src/dto/user.dto.ts`
- Create: `packages/shared/src/dto/notification.dto.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@taxibrat/shared",
  "private": true,
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/"
  },
  "dependencies": {
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@taxibrat/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create enums.ts**

```ts
export enum UserRole {
  USER = "USER",
  MANAGER = "MANAGER",
  SUPER_MANAGER = "SUPER_MANAGER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  PHONE_VERIFIED = "PHONE_VERIFIED",
  PENDING_REVIEW = "PENDING_REVIEW",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  BANNED = "BANNED",
}

export enum VerificationMethod {
  SMS = "SMS",
  TELEGRAM = "TELEGRAM",
}

export enum ManagerSection {
  CHAT = "CHAT",
  TAXI_CHECK = "TAXI_CHECK",
  NO_9_PERCENT = "NO_9_PERCENT",
  USERS = "USERS",
  BUYOUT = "BUYOUT",
}

export enum WorkStatus {
  WORKING = "WORKING",
  RESTING = "RESTING",
}

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  STATUS_CHANGE = "STATUS_CHANGE",
}

export enum AuditEntity {
  USER = "USER",
  PARK = "PARK",
  CAR = "CAR",
  TICKET = "TICKET",
  POINTS = "POINTS",
}

export enum NotificationType {
  SYSTEM = "SYSTEM",
  TICKET = "TICKET",
  POINTS = "POINTS",
  NEWS = "NEWS",
}
```

- [ ] **Step 4: Create constants.ts**

```ts
export const AUTH = {
  CODE_LENGTH: 6,
  CODE_TTL_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  ACCESS_TOKEN_TTL: "15m",
  REFRESH_TOKEN_TTL_DAYS: 90,
} as const;

export const POINTS = {
  REGISTRATION_BONUS: 100,
  DISPLAY_OFFSET: 615,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
```

- [ ] **Step 5: Create dto/auth.dto.ts**

```ts
import { z } from "zod";
import { VerificationMethod } from "../enums";

export const sendCodeSchema = z.object({
  phone: z
    .string()
    .regex(/^\+7\d{10}$/, "Phone must be in format +7XXXXXXXXXX"),
  method: z.nativeEnum(VerificationMethod),
});

export const verifyCodeSchema = z.object({
  phone: z
    .string()
    .regex(/^\+7\d{10}$/, "Phone must be in format +7XXXXXXXXXX"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SendCodeDto = z.infer<typeof sendCodeSchema>;
export type VerifyCodeDto = z.infer<typeof verifyCodeSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
```

- [ ] **Step 6: Create dto/user.dto.ts**

```ts
import { z } from "zod";
import { UserRole, UserStatus } from "../enums";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  patronymic: z.string().max(100).optional(),
  email: z.string().email().optional(),
  birthDate: z.string().date().optional(),
});

export const rejectUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type RejectUserDto = z.infer<typeof rejectUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersSchema>;

export interface UserResponse {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  email: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  friendshipPoints: number;
  referralCode: string;
  createdAt: string;
}
```

- [ ] **Step 7: Create dto/notification.dto.ts**

```ts
import { z } from "zod";
import { NotificationType } from "../enums";

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListNotificationsDto = z.infer<typeof listNotificationsSchema>;

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
```

- [ ] **Step 8: Create index.ts (barrel export)**

```ts
export * from "./enums";
export * from "./constants";
export * from "./dto/auth.dto";
export * from "./dto/user.dto";
export * from "./dto/notification.dto";
```

- [ ] **Step 9: Install and commit**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
pnpm install
git add -A
git commit -m "feat: add shared package with enums, DTOs, constants"
```

---

## Task 3: Database Package (Drizzle Schema + Migrations)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/schema/users.ts`
- Create: `packages/db/src/schema/sessions.ts`
- Create: `packages/db/src/schema/verification-codes.ts`
- Create: `packages/db/src/schema/manager-settings.ts`
- Create: `packages/db/src/schema/audit-log.ts`
- Create: `packages/db/src/schema/notifications.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/migrate.ts`

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@taxibrat/db",
  "private": true,
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.0",
    "@taxibrat/shared": "workspace:*"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "dotenv": "^16.5.0"
  }
}
```

- [ ] **Step 2: Create drizzle.config.ts**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create schema/users.ts**

```ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "MANAGER",
  "SUPER_MANAGER",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "PHONE_VERIFIED",
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "BANNED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  patronymic: varchar("patronymic", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  birthDate: date("birth_date"),
  photoUrl: varchar("photo_url", { length: 500 }),
  role: userRoleEnum("role").notNull().default("USER"),
  status: userStatusEnum("status").notNull().default("PHONE_VERIFIED"),
  friendshipPoints: integer("friendship_points").notNull().default(0),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredById: uuid("referred_by_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

- [ ] **Step 4: Create schema/sessions.ts**

```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Create schema/verification-codes.ts**

```ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

export const verificationMethodEnum = pgEnum("verification_method", [
  "SMS",
  "TELEGRAM",
]);

export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  method: verificationMethodEnum("method").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 6: Create schema/manager-settings.ts**

```ts
import {
  pgTable,
  uuid,
  integer,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const managerSectionEnum = pgEnum("manager_section", [
  "CHAT",
  "TAXI_CHECK",
  "NO_9_PERCENT",
  "USERS",
  "BUYOUT",
]);

export const workStatusEnum = pgEnum("work_status", ["WORKING", "RESTING"]);

export const managerSettings = pgTable(
  "manager_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    section: managerSectionEnum("section").notNull(),
    workStatus: workStatusEnum("work_status").notNull().default("RESTING"),
    fiveMinCount: integer("five_min_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("manager_section_unique").on(table.userId, table.section),
  ]
);
```

- [ ] **Step 7: Create schema/audit-log.ts**

```ts
import {
  pgTable,
  uuid,
  pgEnum,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
  "USER",
  "PARK",
  "CAR",
  "TICKET",
  "POINTS",
]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: auditActionEnum("action").notNull(),
    entity: auditEntityEnum("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entity, table.entityId),
    index("audit_actor_idx").on(table.actorId),
    index("audit_created_idx").on(table.createdAt),
  ]
);
```

- [ ] **Step 8: Create schema/notifications.ts**

```ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  pgEnum,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "SYSTEM",
  "TICKET",
  "POINTS",
  "NEWS",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    link: varchar("link", { length: 500 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId, table.isRead),
  ]
);
```

- [ ] **Step 9: Create client.ts**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as usersSchema from "./schema/users";
import * as sessionsSchema from "./schema/sessions";
import * as verificationCodesSchema from "./schema/verification-codes";
import * as managerSettingsSchema from "./schema/manager-settings";
import * as auditLogSchema from "./schema/audit-log";
import * as notificationsSchema from "./schema/notifications";

const schema = {
  ...usersSchema,
  ...sessionsSchema,
  ...verificationCodesSchema,
  ...managerSettingsSchema,
  ...auditLogSchema,
  ...notificationsSchema,
};

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

- [ ] **Step 10: Create index.ts (barrel export)**

```ts
export * from "./schema/users";
export * from "./schema/sessions";
export * from "./schema/verification-codes";
export * from "./schema/manager-settings";
export * from "./schema/audit-log";
export * from "./schema/notifications";
export * from "./client";
```

- [ ] **Step 11: Create migrate.ts**

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 12: Create tsconfig.json**

```json
{
  "extends": "@taxibrat/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 13: Install and commit**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
pnpm install
git add -A
git commit -m "feat: add db package with Drizzle schema for Phase 1 tables"
```

---

## Task 4: NestJS App Scaffolding

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.validation.ts`
- Create: `apps/api/src/common/pipes/zod-validation.pipe.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@taxibrat/api",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.0",
    "@nestjs/core": "^11.1.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/platform-express": "^11.1.0",
    "@nestjs/platform-socket.io": "^11.1.0",
    "@nestjs/websockets": "^11.1.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcryptjs": "^3.0.0",
    "ioredis": "^5.6.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^3.25.0",
    "@taxibrat/shared": "workspace:*",
    "@taxibrat/db": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.1.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^22.0.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.3.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@taxibrat/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create config/env.validation.ts**

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("90d"),
  EXOLVE_API_KEY: z.string().default(""),
  EXOLVE_SENDER: z.string().default(""),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_GATEWAY_TOKEN: z.string().default(""),
  API_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Environment validation failed:\n${parsed.error.issues.map((i) => `  ${i.path}: ${i.message}`).join("\n")}`
    );
  }
  return parsed.data;
}

export type EnvConfig = z.infer<typeof envSchema>;
```

- [ ] **Step 5: Create common/pipes/zod-validation.pipe.ts**

```ts
import { PipeTransform, BadRequestException } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw new BadRequestException({ message: "Validation failed", errors });
    }
    return result.data;
  }
}
```

- [ ] **Step 6: Create app.module.ts**

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Create main.ts**

```ts
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = app.get(ConfigService<EnvConfig>);
  const port = config.get("API_PORT", { infer: true })!;

  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 8: Create health module**

Create `apps/api/src/modules/health/health.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

Create `apps/api/src/modules/health/health.controller.ts`:
```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

- [ ] **Step 9: Install, verify build, and commit**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
pnpm install
cd apps/api && pnpm run build
```

Expected: Successful build, `dist/` created.

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
git add -A
git commit -m "feat: scaffold NestJS API app with config validation and health endpoint"
```

---

## Task 5: Common Guards and Decorators

**Files:**
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/decorators/auditable.decorator.ts`

- [ ] **Step 1: Create roles.decorator.ts**

```ts
import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@taxibrat/shared";

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Create current-user.decorator.ts**

```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  impersonatedBy?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 3: Create jwt-auth.guard.ts**

```ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

- [ ] **Step 4: Create roles.guard.ts**

```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@taxibrat/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException("No user in request");

    const hasRole = requiredRoles.includes(user.role as UserRole);
    if (!hasRole) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
```

- [ ] **Step 5: Create auditable.decorator.ts**

```ts
import { SetMetadata } from "@nestjs/common";
import { AuditEntity, AuditAction } from "@taxibrat/shared";

export const AUDIT_KEY = "audit";

export interface AuditMeta {
  entity: AuditEntity;
  action: AuditAction;
  entityIdParam?: string; // name of route param holding entity ID
}

export const Auditable = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add JWT guard, roles guard, and common decorators"
```

---

## Task 6: Auth Module

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Create: `apps/api/src/modules/auth/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/providers/exolve.provider.ts`
- Create: `apps/api/src/modules/auth/providers/telegram.provider.ts`
- Modify: `apps/api/src/app.module.ts` — add AuthModule import

- [ ] **Step 1: Write test for auth.service — send-code**

Create `apps/api/src/modules/auth/auth.service.spec.ts`:
```ts
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { VerificationMethod } from "@taxibrat/shared";

const mockDb = {
  insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: "1", code: "123456" }]) }) }),
  select: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) }) }) }),
  update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) }),
  delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockExolve = { sendSms: jest.fn().mockResolvedValue(true) };
const mockTelegram = { sendCode: jest.fn().mockResolvedValue(true) };

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "DATABASE", useValue: mockDb },
        { provide: "REDIS", useValue: mockRedis },
        { provide: "EXOLVE_PROVIDER", useValue: mockExolve },
        { provide: "TELEGRAM_PROVIDER", useValue: mockTelegram },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: "test-secret-min-16-chars",
                JWT_ACCESS_TTL: "15m",
                JWT_REFRESH_TTL: "90d",
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate a 6-digit code", () => {
    const code = (service as any).generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=auth.service.spec
```

Expected: FAIL (AuthService not found)

- [ ] **Step 3: Create exolve.provider.ts**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ExolveProvider {
  private readonly logger = new Logger(ExolveProvider.name);

  constructor(private config: ConfigService) {}

  async sendSms(phone: string, code: string): Promise<boolean> {
    const apiKey = this.config.get("EXOLVE_API_KEY");
    const sender = this.config.get("EXOLVE_SENDER");

    if (!apiKey) {
      this.logger.warn(`[DEV] SMS to ${phone}: code ${code}`);
      return true;
    }

    try {
      const res = await fetch("https://api.exolve.ru/messaging/v1/SendSMS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: sender,
          destination: phone,
          text: `TaxiBrat: ваш код подтверждения ${code}`,
        }),
      });

      if (!res.ok) {
        this.logger.error(`Exolve error: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error("Exolve send failed:", err);
      return false;
    }
  }
}
```

- [ ] **Step 4: Create telegram.provider.ts**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private config: ConfigService) {}

  async sendCode(phone: string, code: string): Promise<boolean> {
    const token = this.config.get("TELEGRAM_GATEWAY_TOKEN");

    if (!token) {
      this.logger.warn(`[DEV] Telegram to ${phone}: code ${code}`);
      return true;
    }

    try {
      const res = await fetch(
        "https://gatewayapi.telegram.org/sendVerificationMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone_number: phone,
            code,
            ttl: 300,
          }),
        },
      );

      if (!res.ok) {
        this.logger.error(`Telegram Gateway error: ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error("Telegram Gateway failed:", err);
      return false;
    }
  }
}
```

- [ ] **Step 5: Create auth.service.ts**

```ts
import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { eq, and, gt } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  users,
  sessions,
  verificationCodes,
} from "@taxibrat/db";
import { AUTH, VerificationMethod } from "@taxibrat/shared";
import { ExolveProvider } from "./providers/exolve.provider";
import { TelegramProvider } from "./providers/telegram.provider";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import type Redis from "ioredis";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    @Inject("EXOLVE_PROVIDER") private exolve: ExolveProvider,
    @Inject("TELEGRAM_PROVIDER") private telegram: TelegramProvider,
    private config: ConfigService,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateReferralCode(): string {
    return randomBytes(6).toString("base64url").slice(0, 8);
  }

  async sendCode(phone: string, method: VerificationMethod) {
    // Invalidate previous codes for this phone
    await this.db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phone, phone));

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + AUTH.CODE_TTL_MINUTES * 60 * 1000);

    await this.db.insert(verificationCodes).values({
      phone,
      code,
      method,
      expiresAt,
      attempts: 0,
    });

    const sent =
      method === VerificationMethod.SMS
        ? await this.exolve.sendSms(phone, code)
        : await this.telegram.sendCode(phone, code);

    if (!sent) {
      throw new BadRequestException("Failed to send verification code");
    }

    return { codeSent: true };
  }

  async verifyCode(phone: string, code: string) {
    const [record] = await this.db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, phone),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(verificationCodes.createdAt)
      .limit(1);

    if (!record) {
      throw new UnauthorizedException("Code expired or not found");
    }

    if (record.attempts >= AUTH.MAX_ATTEMPTS) {
      throw new UnauthorizedException("Too many attempts, request a new code");
    }

    if (record.code !== code) {
      await this.db
        .update(verificationCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(verificationCodes.id, record.id));
      throw new UnauthorizedException("Invalid code");
    }

    // Code correct — clean up
    await this.db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phone, phone));

    // Find or create user
    let [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    let isNewUser = false;
    if (!user) {
      [user] = await this.db
        .insert(users)
        .values({
          phone,
          referralCode: this.generateReferralCode(),
        })
        .returning();
      isNewUser = true;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return { ...tokens, user: this.sanitizeUser(user), isNewUser };
  }

  async refreshToken(refreshToken: string) {
    // Check Redis whitelist
    const storedUserId = await this.redis.get(`refresh:${refreshToken}`);
    if (!storedUserId) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Find session
    const allSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, storedUserId));

    let validSession = null;
    for (const s of allSessions) {
      if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
        validSession = s;
        break;
      }
    }

    if (!validSession || validSession.expiresAt < new Date()) {
      await this.redis.del(`refresh:${refreshToken}`);
      throw new UnauthorizedException("Session expired");
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, storedUserId))
      .limit(1);

    if (!user) throw new UnauthorizedException("User not found");

    // Rotate: delete old, create new
    await this.db.delete(sessions).where(eq(sessions.id, validSession.id));
    await this.redis.del(`refresh:${refreshToken}`);

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async logout(refreshToken: string) {
    await this.redis.del(`refresh:${refreshToken}`);

    const allSessions = await this.db.select().from(sessions);
    for (const s of allSessions) {
      if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
        await this.db.delete(sessions).where(eq(sessions.id, s.id));
        break;
      }
    }

    return { loggedOut: true };
  }

  private async generateTokens(user: typeof users.$inferSelect) {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = sign(payload, this.config.get("JWT_SECRET")!, {
      expiresIn: this.config.get("JWT_ACCESS_TTL"),
    });

    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + AUTH.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    // Redis whitelist (TTL = refresh token lifetime)
    await this.redis.set(
      `refresh:${refreshToken}`,
      user.id,
      "EX",
      AUTH.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      patronymic: user.patronymic,
      email: user.email,
      birthDate: user.birthDate,
      photoUrl: user.photoUrl,
      role: user.role,
      status: user.status,
      friendshipPoints: user.friendshipPoints,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 6: Create jwt.strategy.ts**

```ts
import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users } from "@taxibrat/db";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject("DATABASE") private db: Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const [user] = await this.db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException("User not found");
    if (user.status === "BANNED") throw new UnauthorizedException("User is banned");

    return payload;
  }
}
```

- [ ] **Step 7: Create auth.controller.ts**

```ts
import { Controller, Post, Body, UsePipes } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  sendCodeSchema,
  verifyCodeSchema,
  refreshTokenSchema,
  SendCodeDto,
  VerifyCodeDto,
  RefreshTokenDto,
} from "@taxibrat/shared";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("send-code")
  @UsePipes(new ZodValidationPipe(sendCodeSchema))
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto.phone, dto.method);
  }

  @Post("verify")
  @UsePipes(new ZodValidationPipe(verifyCodeSchema))
  verify(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.phone, dto.code);
  }

  @Post("refresh")
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
```

- [ ] **Step 8: Create auth.module.ts**

```ts
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { createDb } from "@taxibrat/db";
import Redis from "ioredis";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { ExolveProvider } from "./providers/exolve.provider";
import { TelegramProvider } from "./providers/telegram.provider";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ExolveProvider,
    TelegramProvider,
    {
      provide: "DATABASE",
      useFactory: (config: ConfigService) => createDb(config.get("DATABASE_URL")!),
      inject: [ConfigService],
    },
    {
      provide: "REDIS",
      useFactory: (config: ConfigService) => new Redis(config.get("REDIS_URL")!),
      inject: [ConfigService],
    },
    { provide: "EXOLVE_PROVIDER", useExisting: ExolveProvider },
    { provide: "TELEGRAM_PROVIDER", useExisting: TelegramProvider },
  ],
  exports: ["DATABASE", "REDIS"],
})
export class AuthModule {}
```

- [ ] **Step 9: Add AuthModule to AppModule**

Update `apps/api/src/app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 10: Run tests**

```bash
cd apps/api && pnpm test -- --testPathPattern=auth.service.spec
```

Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add auth module with SMS/Telegram verification, JWT tokens, Redis whitelist"
```

---

## Task 7: Users Module

**Files:**
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.admin.controller.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` — add UsersModule

- [ ] **Step 1: Write test for users.service**

Create `apps/api/src/modules/users/users.service.spec.ts`:
```ts
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";

const mockUser = {
  id: "user-1",
  phone: "+71234567890",
  firstName: null,
  lastName: null,
  status: "PHONE_VERIFIED",
  role: "USER",
  friendshipPoints: 0,
  referralCode: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockUser]),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...mockUser, firstName: "Иван" }]),
      }),
    }),
  }),
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: "DATABASE", useValue: mockDb },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=users.service.spec
```

Expected: FAIL

- [ ] **Step 3: Create users.service.ts**

```ts
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users, notifications } from "@taxibrat/db";
import {
  UserStatus,
  POINTS,
  UpdateProfileDto,
  ListUsersDto,
  NotificationType,
} from "@taxibrat/shared";

@Injectable()
export class UsersService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async getById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.getById(userId);

    if (user.status === "BANNED") {
      throw new BadRequestException("Account is banned");
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...dto,
        status: UserStatus.PENDING_REVIEW,
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async approveUser(userId: string) {
    const user = await this.getById(userId);
    if (user.status !== UserStatus.PENDING_REVIEW) {
      throw new BadRequestException("User is not pending review");
    }

    const isFirstApproval = user.friendshipPoints === 0;

    const [updated] = await this.db
      .update(users)
      .set({
        status: UserStatus.ACTIVE,
        rejectionReason: null,
        friendshipPoints: isFirstApproval
          ? POINTS.REGISTRATION_BONUS
          : user.friendshipPoints,
      })
      .where(eq(users.id, userId))
      .returning();

    // Create notification
    await this.db.insert(notifications).values({
      userId,
      type: NotificationType.SYSTEM,
      title: "Профиль подтверждён",
      body: isFirstApproval
        ? `Ваш профиль подтверждён! Начислено ${POINTS.REGISTRATION_BONUS} баллов дружбы.`
        : "Ваш профиль успешно обновлён.",
    });

    return updated;
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.getById(userId);
    if (user.status !== UserStatus.PENDING_REVIEW) {
      throw new BadRequestException("User is not pending review");
    }

    const [updated] = await this.db
      .update(users)
      .set({
        status: UserStatus.REJECTED,
        rejectionReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();

    await this.db.insert(notifications).values({
      userId,
      type: NotificationType.SYSTEM,
      title: "Профиль отклонён",
      body: `Причина: ${reason}. Исправьте данные и отправьте повторно.`,
    });

    return updated;
  }

  async listUsers(dto: ListUsersDto) {
    const conditions = [];
    if (dto.status) conditions.push(eq(users.status, dto.status));
    if (dto.role) conditions.push(eq(users.role, dto.role));
    if (dto.search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${dto.search}%`),
          ilike(users.lastName, `%${dto.search}%`),
          ilike(users.phone, `%${dto.search}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit)
        .orderBy(users.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async findDuplicatesByName(firstName: string, lastName: string, excludeId?: string) {
    const conditions = [
      ilike(users.firstName, firstName),
      ilike(users.lastName, lastName),
    ];
    if (excludeId) {
      conditions.push(sql`${users.id} != ${excludeId}`);
    }

    return this.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(and(...conditions));
  }
}
```

- [ ] **Step 4: Create users.controller.ts**

```ts
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import { updateProfileSchema, UpdateProfileDto } from "@taxibrat/shared";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getById(user.sub);
  }

  @Patch("me")
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }
}
```

- [ ] **Step 5: Create users.admin.controller.ts**

```ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import {
  UserRole,
  listUsersSchema,
  ListUsersDto,
  rejectUserSchema,
  RejectUserDto,
} from "@taxibrat/shared";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersAdminController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  listUsers(@Query(new ZodValidationPipe(listUsersSchema)) dto: ListUsersDto) {
    return this.usersService.listUsers(dto);
  }

  @Post(":id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  approveUser(@Param("id") id: string) {
    return this.usersService.approveUser(id);
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  rejectUser(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectUserSchema)) dto: RejectUserDto,
  ) {
    return this.usersService.rejectUser(id, dto.reason);
  }
}
```

- [ ] **Step 6: Create users.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./users.controller";
import { UsersAdminController } from "./users.admin.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 7: Add UsersModule to AppModule**

Add to imports in `apps/api/src/app.module.ts`:
```ts
import { UsersModule } from "./modules/users/users.module";
// ... add UsersModule to imports array
```

- [ ] **Step 8: Run tests and commit**

```bash
cd apps/api && pnpm test -- --testPathPattern=users.service.spec
```

Expected: PASS

```bash
git add -A
git commit -m "feat: add users module with profile CRUD, admin approve/reject, duplicate detection"
```

---

## Task 8: Managers Module

**Files:**
- Create: `apps/api/src/modules/managers/managers.module.ts`
- Create: `apps/api/src/modules/managers/managers.controller.ts`
- Create: `apps/api/src/modules/managers/managers.service.ts`
- Modify: `apps/api/src/app.module.ts` — add ManagersModule

- [ ] **Step 1: Create managers.service.ts**

```ts
import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { managerSettings } from "@taxibrat/db";
import { ManagerSection, WorkStatus } from "@taxibrat/shared";

@Injectable()
export class ManagersService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async getSettings(userId: string) {
    return this.db
      .select()
      .from(managerSettings)
      .where(eq(managerSettings.userId, userId));
  }

  async toggleStatus(userId: string, section: ManagerSection) {
    const [existing] = await this.db
      .select()
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.userId, userId),
          eq(managerSettings.section, section),
        ),
      )
      .limit(1);

    if (!existing) {
      // Create with WORKING status
      const [created] = await this.db
        .insert(managerSettings)
        .values({ userId, section, workStatus: WorkStatus.WORKING })
        .returning();
      return created;
    }

    const newStatus =
      existing.workStatus === WorkStatus.WORKING
        ? WorkStatus.RESTING
        : WorkStatus.WORKING;

    const [updated] = await this.db
      .update(managerSettings)
      .set({
        workStatus: newStatus,
        fiveMinCount: newStatus === WorkStatus.WORKING ? 0 : existing.fiveMinCount,
      })
      .where(eq(managerSettings.id, existing.id))
      .returning();

    return updated;
  }

  async getActiveManagers(section: ManagerSection) {
    return this.db
      .select()
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, section),
          eq(managerSettings.workStatus, WorkStatus.WORKING),
        ),
      );
  }
}
```

- [ ] **Step 2: Create managers.controller.ts**

```ts
import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ManagersService } from "./managers.service";
import { UserRole, ManagerSection } from "@taxibrat/shared";

@Controller("managers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
export class ManagersController {
  constructor(private managersService: ManagersService) {}

  @Get("settings")
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.managersService.getSettings(user.sub);
  }

  @Patch("settings/:section")
  toggleStatus(
    @CurrentUser() user: JwtPayload,
    @Param("section") section: ManagerSection,
  ) {
    return this.managersService.toggleStatus(user.sub, section);
  }
}
```

- [ ] **Step 3: Create managers.module.ts**

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ManagersController } from "./managers.controller";
import { ManagersService } from "./managers.service";

@Module({
  imports: [AuthModule],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
```

- [ ] **Step 4: Add to AppModule and commit**

```bash
git add -A
git commit -m "feat: add managers module with work status toggle per section"
```

---

## Task 9: Notifications Module (with Socket.IO)

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/api/src/modules/notifications/notifications.gateway.ts`
- Modify: `apps/api/src/app.module.ts` — add NotificationsModule

- [ ] **Step 1: Create notifications.service.ts**

```ts
import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { notifications } from "@taxibrat/db";
import { NotificationType, ListNotificationsDto } from "@taxibrat/shared";

@Injectable()
export class NotificationsService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    const [notification] = await this.db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async list(userId: string, dto: ListNotificationsDto) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.isRead, notifications.createdAt)
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
    ]);

    const [unreadResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );

    return {
      data,
      total: Number(countResult[0].count),
      unread: Number(unreadResult.count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async markRead(userId: string, notificationId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }
}
```

- [ ] **Step 2: Create notifications.gateway.ts**

```ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/notifications",
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private config: ConfigService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = verify(token, this.config.get("JWT_SECRET")!) as {
        sub: string;
      };
      const userId = payload.sub;

      client.join(`user:${userId}`);
      this.logger.log(`Client ${client.id} joined room user:${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  pushToUser(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit("notification", notification);
  }
}
```

- [ ] **Step 3: Create notifications.controller.ts**

```ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";
import { listNotificationsSchema, ListNotificationsDto } from "@taxibrat/shared";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listNotificationsSchema)) dto: ListNotificationsDto,
  ) {
    return this.notificationsService.list(user.sub, dto);
  }

  @Patch(":id/read")
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }
}
```

- [ ] **Step 4: Create notifications.module.ts**

```ts
import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
```

- [ ] **Step 5: Add to AppModule and commit**

```bash
git add -A
git commit -m "feat: add notifications module with Socket.IO real-time push"
```

---

## Task 10: Audit Module

**Files:**
- Create: `apps/api/src/modules/audit/audit.module.ts`
- Create: `apps/api/src/modules/audit/audit.controller.ts`
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/common/interceptors/audit.interceptor.ts`
- Modify: `apps/api/src/app.module.ts` — add AuditModule

- [ ] **Step 1: Create audit.service.ts**

```ts
import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { auditLog, users } from "@taxibrat/db";
import { AuditAction, AuditEntity } from "@taxibrat/shared";

@Injectable()
export class AuditService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async log(data: {
    actorId: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    await this.db.insert(auditLog).values({
      actorId: data.actorId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
    });
  }

  async search(params: {
    entity?: AuditEntity;
    actorId?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [];
    if (params.entity) conditions.push(eq(auditLog.entity, params.entity));
    if (params.actorId) conditions.push(eq(auditLog.actorId, params.actorId));
    if (params.from) conditions.push(gte(auditLog.createdAt, new Date(params.from)));
    if (params.to) conditions.push(lte(auditLog.createdAt, new Date(params.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: auditLog.id,
          actorId: auditLog.actorId,
          actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          action: auditLog.action,
          entity: auditLog.entity,
          entityId: auditLog.entityId,
          oldValue: auditLog.oldValue,
          newValue: auditLog.newValue,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(where)
        .orderBy(sql`${auditLog.createdAt} desc`)
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLog)
        .where(where),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      page: params.page,
      limit: params.limit,
    };
  }
}
```

- [ ] **Step 2: Create audit.interceptor.ts**

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { AUDIT_KEY, AuditMeta } from "../decorators/auditable.decorator";
import { AuditService } from "../../modules/audit/audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest();
    const actorId = request.user?.sub;
    if (!actorId) return next.handle();

    const entityId =
      meta.entityIdParam && request.params[meta.entityIdParam]
        ? request.params[meta.entityIdParam]
        : undefined;

    return next.handle().pipe(
      tap((result) => {
        this.auditService
          .log({
            actorId,
            action: meta.action,
            entity: meta.entity,
            entityId: entityId || result?.id || "unknown",
            newValue: result,
          })
          .catch(() => {}); // fire and forget
      }),
    );
  }
}
```

- [ ] **Step 3: Create audit.controller.ts**

```ts
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditService } from "./audit.service";
import { UserRole, AuditEntity } from "@taxibrat/shared";

@Controller("admin/audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  search(
    @Query("entity") entity?: AuditEntity,
    @Query("actorId") actorId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.auditService.search({
      entity,
      actorId,
      from,
      to,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
    });
  }
}
```

- [ ] **Step 4: Create audit.module.ts**

```ts
import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditInterceptor } from "../../common/interceptors/audit.interceptor";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
```

- [ ] **Step 5: Update AppModule with all modules**

Final `apps/api/src/app.module.ts`:
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
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add audit module with interceptor and search endpoint"
```

---

## Task 11: Next.js App Scaffolding

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/lib/socket.ts`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@taxibrat/web",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "socket.io-client": "^4.8.0",
    "@taxibrat/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "postcss": "^8.5.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@taxibrat/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default config;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "@taxibrat/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        taxi: {
          yellow: "#FFC800",
          dark: "#1A1A1A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create src/lib/api-client.ts**

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 6: Create src/lib/auth.ts**

```ts
"use client";

const ACCESS_TOKEN_KEY = "tb_access_token";
const REFRESH_TOKEN_KEY = "tb_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
```

- [ ] **Step 7: Create src/lib/socket.ts**

```ts
"use client";

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
  socket = io(`${wsUrl}/notifications`, {
    auth: { token: getAccessToken() },
    autoConnect: false,
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: getAccessToken() };
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 8: Create src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ТаксиБрат — честный рейтинг таксопарков",
  description: "Подбор таксопарков для сотрудничества с независимым рейтингом",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#F3F1E7] text-[#1A1A1A] antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create src/app/globals.css**

```css
@import "tailwindcss";
```

- [ ] **Step 10: Create src/app/page.tsx**

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">ТаксиБрат</h1>
      <p className="mt-4 text-lg text-gray-600">
        Честный рейтинг таксопарков. Скоро запуск.
      </p>
    </main>
  );
}
```

- [ ] **Step 11: Install, verify dev server, commit**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
pnpm install
cd apps/web && pnpm run build
```

Expected: Successful build.

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2
git add -A
git commit -m "feat: scaffold Next.js frontend with API client, auth helpers, Socket.IO"
```

---

## Task 12: Docker Compose + Nginx

**Files:**
- Create: `docker/docker-compose.yml`
- Create: `docker/docker-compose.dev.yml`
- Create: `docker/Dockerfile.api`
- Create: `docker/Dockerfile.web`
- Create: `docker/nginx.conf`

- [ ] **Step 1: Create Dockerfile.api**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
RUN cd apps/api && pnpm run build

FROM base AS runner
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Create Dockerfile.web**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN cd apps/web && pnpm run build

FROM base AS runner
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: taxibrat
      POSTGRES_USER: taxibrat
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-taxibrat_secret}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taxibrat"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://taxibrat:${POSTGRES_PASSWORD:-taxibrat_secret}@postgres:5432/taxibrat
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_TTL: 15m
      JWT_REFRESH_TTL: 90d
      EXOLVE_API_KEY: ${EXOLVE_API_KEY:-}
      EXOLVE_SENDER: ${EXOLVE_SENDER:-}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:-}
      TELEGRAM_GATEWAY_TOKEN: ${TELEGRAM_GATEWAY_TOKEN:-}
      API_PORT: 3000
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXT_PUBLIC_WS_URL: ws://api:3000
    ports:
      - "127.0.0.1:3001:3001"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - api
      - web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot-etc:/etc/letsencrypt:ro
      - certbot-var:/var/lib/letsencrypt

volumes:
  pgdata:
  redisdata:
  certbot-etc:
  certbot-var:
```

- [ ] **Step 4: Create docker-compose.dev.yml**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: taxibrat
      POSTGRES_USER: taxibrat
      POSTGRES_PASSWORD: taxibrat_dev
    volumes:
      - pgdata_dev:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  pgdata_dev:
```

- [ ] **Step 5: Create nginx.conf**

```nginx
upstream web {
    server web:3001;
}

upstream api {
    server api:3000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Docker Compose setup with Nginx, PostgreSQL, Redis"
```

---

## Task 13: Database Migration and Smoke Test

**Files:**
- No new files, validation of existing setup

- [ ] **Step 1: Start dev databases**

```bash
cd /c/Users/Professional/Projects/Taxi/taxibrat-v2/docker
docker compose -f docker-compose.dev.yml up -d
```

Expected: postgres and redis running.

- [ ] **Step 2: Create .env.local for development**

Create `taxibrat-v2/.env` (gitignored):
```env
DATABASE_URL=postgresql://taxibrat:taxibrat_dev@localhost:5432/taxibrat
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod-min16
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=90d
API_PORT=3000
NODE_ENV=development
```

- [ ] **Step 3: Generate and run migrations**

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate
```

Expected: Tables created in PostgreSQL.

- [ ] **Step 4: Start API and verify health**

```bash
cd apps/api && pnpm run dev
```

In another terminal:
```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 5: Test auth flow**

```bash
# Send code (dev mode — code logged to console)
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"+71234567890","method":"SMS"}'
```

Expected: `{"codeSent":true}` and code printed in API console.

- [ ] **Step 6: Start Next.js and verify**

```bash
cd apps/web && pnpm run dev
```

Open `http://localhost:3001` — should show "ТаксиБрат" placeholder page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: verify full stack — migrations, API health, auth flow, frontend"
```

---

## Summary

| Task | Description | Commit message |
|------|-------------|----------------|
| 1 | Monorepo scaffolding | `chore: scaffold monorepo with Turborepo + pnpm` |
| 2 | Shared package | `feat: add shared package with enums, DTOs, constants` |
| 3 | DB package (Drizzle) | `feat: add db package with Drizzle schema for Phase 1 tables` |
| 4 | NestJS scaffolding | `feat: scaffold NestJS API app with config validation and health endpoint` |
| 5 | Guards & decorators | `feat: add JWT guard, roles guard, and common decorators` |
| 6 | Auth module | `feat: add auth module with SMS/Telegram verification, JWT tokens, Redis whitelist` |
| 7 | Users module | `feat: add users module with profile CRUD, admin approve/reject, duplicate detection` |
| 8 | Managers module | `feat: add managers module with work status toggle per section` |
| 9 | Notifications module | `feat: add notifications module with Socket.IO real-time push` |
| 10 | Audit module | `feat: add audit module with interceptor and search endpoint` |
| 11 | Next.js scaffolding | `feat: scaffold Next.js frontend with API client, auth helpers, Socket.IO` |
| 12 | Docker Compose | `feat: add Docker Compose setup with Nginx, PostgreSQL, Redis` |
| 13 | Smoke test | `chore: verify full stack — migrations, API health, auth flow, frontend` |
