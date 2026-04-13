# TaxiBrat v2 Phase 2b: Ticket System + Real-time Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a universal ticket system with real-time chat, round-robin distribution to managers, buffer for offline managers, SM review flow, and friendship points awards on ticket completion.

**Architecture:** 3 new DB tables (tickets, ticket_messages, ticket_buffer), 1 NestJS module with 7 files. Socket.IO /chat namespace for real-time messaging. Redis for round-robin counters. @nestjs/schedule cron for buffer drain every 15 min.

**Tech Stack:** Drizzle ORM (3 tables), NestJS (tickets module), Socket.IO (/chat namespace), Redis (round-robin counters), @nestjs/schedule (cron)

---

## File Structure

```
packages/shared/src/
├── enums.ts                                    # ADD: TicketTopic, TicketStatus, RelatedEntityType
├── dto/ticket.dto.ts                           # NEW
├── constants.ts                                # ADD: TICKET_TOPIC_CONFIG
├── index.ts                                    # ADD: re-export ticket dto

packages/db/src/
├── schema/tickets.ts                           # NEW
├── schema/ticket-messages.ts                   # NEW
├── schema/ticket-buffer.ts                     # NEW
├── client.ts                                   # MODIFY: add new schemas
├── index.ts                                    # MODIFY: re-export

apps/api/
├── package.json                                # MODIFY: add @nestjs/schedule
├── src/app.module.ts                           # MODIFY: add TicketsModule, ScheduleModule
└── src/modules/tickets/
    ├── tickets.module.ts                       # NEW
    ├── tickets.controller.ts                   # NEW: user endpoints
    ├── tickets.admin.controller.ts             # NEW: manager + SM endpoints
    ├── tickets.service.ts                      # NEW: CRUD, status, points
    ├── ticket-distributor.service.ts           # NEW: round-robin, buffer, cron
    ├── messages.service.ts                     # NEW: message CRUD
    └── chat.gateway.ts                         # NEW: Socket.IO /chat
```

---

## Task 1: Shared Types for Tickets

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/dto/ticket.dto.ts`
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Append enums to enums.ts**

```ts
export enum TicketTopic {
  PARK_CHECK = "PARK_CHECK",
  USER_BASE_CHECK = "USER_BASE_CHECK",
  TAXI_CONNECT = "TAXI_CONNECT",
  BUYOUT = "BUYOUT",
  LEGAL = "LEGAL",
  FRIENDSHIP_POINTS = "FRIENDSHIP_POINTS",
  OTHER = "OTHER",
}

export enum TicketStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING_SM_REVIEW = "PENDING_SM_REVIEW",
  SM_REJECTED = "SM_REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum RelatedEntityType {
  PARK = "PARK",
  PARK_CLASS = "PARK_CLASS",
  VEHICLE = "VEHICLE",
  USER = "USER",
}
```

- [ ] **Step 2: Create dto/ticket.dto.ts**

```ts
import { z } from "zod";
import { TicketTopic, TicketStatus, RelatedEntityType } from "../enums";

export const createTicketSchema = z.object({
  topic: z.nativeEnum(TicketTopic),
  relatedEntityType: z.nativeEnum(RelatedEntityType).optional(),
  relatedEntityId: z.string().uuid().optional(),
  body: z.string().min(1).max(5000),
});

export const listTicketsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  topic: z.nativeEnum(TicketTopic).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const rejectTicketSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const approveTicketSchema = z.object({
  pointsAwarded: z.number().int().min(0).default(0),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;
export type ListTicketsDto = z.infer<typeof listTicketsSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type RejectTicketDto = z.infer<typeof rejectTicketSchema>;
export type ApproveTicketDto = z.infer<typeof approveTicketSchema>;
```

- [ ] **Step 3: Add TICKET_TOPIC_CONFIG to constants.ts**

```ts
export const TICKET_TOPIC_CONFIG: Record<
  string,
  { section: string; smReviewRequired: boolean; defaultPoints: number }
> = {
  PARK_CHECK: { section: "TAXI_CHECK", smReviewRequired: true, defaultPoints: 150 },
  USER_BASE_CHECK: { section: "CHAT", smReviewRequired: true, defaultPoints: 0 },
  TAXI_CONNECT: { section: "CHAT", smReviewRequired: true, defaultPoints: 150 },
  BUYOUT: { section: "BUYOUT", smReviewRequired: false, defaultPoints: 0 },
  LEGAL: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
  FRIENDSHIP_POINTS: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
  OTHER: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
};
```

- [ ] **Step 4: Add to index.ts**

```ts
export * from "./dto/ticket.dto";
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add ticket enums, DTOs, and topic config constants"
```

---

## Task 2: Database Schema — 3 Ticket Tables

**Files:**
- Create: `packages/db/src/schema/tickets.ts`
- Create: `packages/db/src/schema/ticket-messages.ts`
- Create: `packages/db/src/schema/ticket-buffer.ts`
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create schema/tickets.ts**

```ts
import {
  pgTable, uuid, varchar, text, integer, pgEnum, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const ticketTopicEnum = pgEnum("ticket_topic", [
  "PARK_CHECK", "USER_BASE_CHECK", "TAXI_CONNECT",
  "BUYOUT", "LEGAL", "FRIENDSHIP_POINTS", "OTHER",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "NEW", "IN_PROGRESS", "PENDING_SM_REVIEW",
  "SM_REJECTED", "COMPLETED", "CANCELLED",
]);

export const relatedEntityTypeEnum = pgEnum("related_entity_type", [
  "PARK", "PARK_CLASS", "VEHICLE", "USER",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    topic: ticketTopicEnum("topic").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("NEW"),
    relatedEntityType: relatedEntityTypeEnum("related_entity_type"),
    relatedEntityId: uuid("related_entity_id"),
    smReviewedById: uuid("sm_reviewed_by_id").references(() => users.id),
    smRejectionReason: text("sm_rejection_reason"),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("tickets_user_idx").on(table.userId),
    index("tickets_assigned_idx").on(table.assignedToId),
    index("tickets_status_idx").on(table.status),
    index("tickets_topic_idx").on(table.topic),
  ]
);
```

- [ ] **Step 2: Create schema/ticket-messages.ts**

```ts
import {
  pgTable, uuid, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { tickets } from "./tickets";
import { users } from "./users";

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_ticket_idx").on(table.ticketId),
  ]
);
```

- [ ] **Step 3: Create schema/ticket-buffer.ts**

```ts
import {
  pgTable, uuid, timestamp,
} from "drizzle-orm/pg-core";
import { tickets } from "./tickets";
import { managerSectionEnum } from "./manager-settings";

export const ticketBuffer = pgTable("ticket_buffer", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().unique().references(() => tickets.id, { onDelete: "cascade" }),
  section: managerSectionEnum("section").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Update client.ts and index.ts**

Add to `packages/db/src/client.ts` imports:
```ts
import * as ticketsSchema from "./schema/tickets";
import * as ticketMessagesSchema from "./schema/ticket-messages";
import * as ticketBufferSchema from "./schema/ticket-buffer";
```
And spread into schema: `...ticketsSchema, ...ticketMessagesSchema, ...ticketBufferSchema,`

Add to `packages/db/src/index.ts`:
```ts
export * from "./schema/tickets";
export * from "./schema/ticket-messages";
export * from "./schema/ticket-buffer";
```

- [ ] **Step 5: Build and commit**

```bash
cd apps/api && npx nest build
git add -A && git commit -m "feat: add ticket database schema — tickets, messages, buffer tables"
```

---

## Task 3: Messages Service

**Files:**
- Create: `apps/api/src/modules/tickets/messages.service.ts`

- [ ] **Step 1: Create messages.service.ts**

```ts
import { Injectable, Inject } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { ticketMessages, users } from "@taxibrat/db";

@Injectable()
export class MessagesService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(ticketId: string, senderId: string, body: string, isSystem = false) {
    const [message] = await this.db
      .insert(ticketMessages)
      .values({ ticketId, senderId, body, isSystem })
      .returning();
    return message;
  }

  async createSystem(ticketId: string, systemUserId: string, body: string) {
    return this.create(ticketId, systemUserId, body, true);
  }

  async listByTicket(ticketId: string, page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: ticketMessages.id,
          ticketId: ticketMessages.ticketId,
          senderId: ticketMessages.senderId,
          senderFirstName: users.firstName,
          senderLastName: users.lastName,
          senderRole: users.role,
          body: ticketMessages.body,
          isSystem: ticketMessages.isSystem,
          createdAt: ticketMessages.createdAt,
        })
        .from(ticketMessages)
        .innerJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, ticketId))
        .orderBy(desc(ticketMessages.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticketId)),
    ]);

    return {
      data: data.map((m) => ({
        ...m,
        senderName: m.senderFirstName && m.senderLastName
          ? `${m.senderFirstName} ${m.senderLastName.charAt(0)}.`
          : "Система",
      })),
      total: Number(countResult[0].count),
      page,
      limit,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add ticket messages service with CRUD"
```

---

## Task 4: Ticket Distributor (Round-Robin + Buffer + Cron)

**Files:**
- Create: `apps/api/src/modules/tickets/ticket-distributor.service.ts`

- [ ] **Step 1: Install @nestjs/schedule**

```bash
cd /c/Users/Professional/Projects/taxibrat-v2/apps/api && pnpm add @nestjs/schedule
```

- [ ] **Step 2: Create ticket-distributor.service.ts**

```ts
import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { eq, and, asc } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, ticketBuffer, managerSettings, users } from "@taxibrat/db";
import { TICKET_TOPIC_CONFIG, TicketTopic } from "@taxibrat/shared";
import { MessagesService } from "./messages.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "@taxibrat/shared";
import type Redis from "ioredis";

@Injectable()
export class TicketDistributorService {
  private readonly logger = new Logger(TicketDistributorService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    private messagesService: MessagesService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async assignTicket(ticketId: string, topic: TicketTopic, systemUserId: string): Promise<string | null> {
    const config = TICKET_TOPIC_CONFIG[topic];
    const section = config.section;

    // Get active managers for this section
    const activeManagers = await this.db
      .select({ userId: managerSettings.userId })
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, section as any),
          eq(managerSettings.workStatus, "WORKING"),
        ),
      );

    if (activeManagers.length === 0) {
      // No active managers — put in buffer
      await this.db.insert(ticketBuffer).values({
        ticketId,
        section: section as any,
      });

      await this.messagesService.createSystem(
        ticketId,
        systemUserId,
        "Все менеджеры сейчас недоступны. Ваш запрос в очереди.",
      );

      this.logger.log(`Ticket ${ticketId} buffered for section ${section}`);
      return null;
    }

    // Round-robin assignment
    const counter = await this.redis.incr(`round_robin:${section}`);
    const index = (counter - 1) % activeManagers.length;
    const assignedToId = activeManagers[index].userId;

    await this.db
      .update(tickets)
      .set({ assignedToId })
      .where(eq(tickets.id, ticketId));

    // Get manager name for system message
    const [manager] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, assignedToId))
      .limit(1);

    const managerName = manager?.firstName && manager?.lastName
      ? `${manager.firstName} ${manager.lastName.charAt(0)}.`
      : "менеджера";

    await this.messagesService.createSystem(
      ticketId,
      systemUserId,
      `Тикет назначен на менеджера ${managerName}`,
    );

    // Notify manager
    await this.notificationsService.create({
      userId: assignedToId,
      type: NotificationType.TICKET,
      title: "Новый тикет",
      body: "Вам назначен новый тикет",
      link: `/admin/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(assignedToId, {
      type: "new-ticket",
      ticketId,
    });

    this.logger.log(`Ticket ${ticketId} assigned to ${assignedToId}`);
    return assignedToId;
  }

  @Cron("*/15 * * * *")
  async drainBuffer() {
    const sections = ["CHAT", "TAXI_CHECK", "NO_9_PERCENT", "USERS", "BUYOUT"];

    for (const section of sections) {
      const activeManagers = await this.db
        .select({ userId: managerSettings.userId })
        .from(managerSettings)
        .where(
          and(
            eq(managerSettings.section, section as any),
            eq(managerSettings.workStatus, "WORKING"),
          ),
        );

      if (activeManagers.length === 0) continue;

      // Get oldest buffered ticket for this section
      const [buffered] = await this.db
        .select()
        .from(ticketBuffer)
        .where(eq(ticketBuffer.section, section as any))
        .orderBy(asc(ticketBuffer.createdAt))
        .limit(1);

      if (!buffered) continue;

      // Round-robin assignment
      const counter = await this.redis.incr(`round_robin:${section}`);
      const index = (counter - 1) % activeManagers.length;
      const assignedToId = activeManagers[index].userId;

      // Update ticket
      await this.db
        .update(tickets)
        .set({ assignedToId })
        .where(eq(tickets.id, buffered.ticketId));

      // Remove from buffer
      await this.db
        .delete(ticketBuffer)
        .where(eq(ticketBuffer.id, buffered.id));

      // Get manager name
      const [manager] = await this.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, assignedToId))
        .limit(1);

      const managerName = manager?.firstName && manager?.lastName
        ? `${manager.firstName} ${manager.lastName.charAt(0)}.`
        : "менеджера";

      // Get ticket creator for system user id
      const [ticket] = await this.db
        .select({ userId: tickets.userId })
        .from(tickets)
        .where(eq(tickets.id, buffered.ticketId))
        .limit(1);

      if (ticket) {
        await this.messagesService.createSystem(
          buffered.ticketId,
          ticket.userId,
          `Тикет назначен на менеджера ${managerName}`,
        );
      }

      // Notify manager
      await this.notificationsService.create({
        userId: assignedToId,
        type: NotificationType.TICKET,
        title: "Тикет из очереди",
        body: "Вам назначен тикет из буфера",
        link: `/admin/tickets/${buffered.ticketId}`,
      });
      this.notificationsGateway.pushToUser(assignedToId, {
        type: "new-ticket",
        ticketId: buffered.ticketId,
      });

      this.logger.log(`Buffer: ticket ${buffered.ticketId} assigned to ${assignedToId}`);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add ticket distributor with round-robin and cron buffer drain"
```

---

## Task 5: Tickets Service (CRUD + Status + Points)

**Files:**
- Create: `apps/api/src/modules/tickets/tickets.service.ts`

- [ ] **Step 1: Create tickets.service.ts**

```ts
import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, users, ticketMessages } from "@taxibrat/db";
import {
  CreateTicketDto, ListTicketsDto, TicketStatus, TicketTopic,
  TICKET_TOPIC_CONFIG, NotificationType,
} from "@taxibrat/shared";
import { TicketDistributorService } from "./ticket-distributor.service";
import { MessagesService } from "./messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class TicketsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private distributor: TicketDistributorService,
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    // Build auto-generated title
    const [user] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = user?.lastName && user?.firstName
      ? `${user.lastName} ${user.firstName}`
      : "Пользователь";

    const title = this.generateTitle(dto.topic, userName);

    const [ticket] = await this.db
      .insert(tickets)
      .values({
        userId,
        topic: dto.topic,
        title,
        relatedEntityType: dto.relatedEntityType as any,
        relatedEntityId: dto.relatedEntityId,
      })
      .returning();

    // Create first message from user
    await this.messagesService.create(ticket.id, userId, dto.body);

    // Distribute to manager
    await this.distributor.assignTicket(ticket.id, dto.topic as TicketTopic, userId);

    return ticket;
  }

  async getById(id: string) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async listForUser(userId: string, dto: ListTicketsDto) {
    const conditions = [eq(tickets.userId, userId)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));
    if (dto.status) conditions.push(eq(tickets.status, dto.status as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listForManager(managerId: string, dto: ListTicketsDto) {
    const conditions = [eq(tickets.assignedToId, managerId)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));
    if (dto.status) conditions.push(eq(tickets.status, dto.status as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listForSmReview(dto: ListTicketsDto) {
    const conditions = [eq(tickets.status, "PENDING_SM_REVIEW" as any)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async cancel(ticketId: string, userId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.userId !== userId) throw new ForbiddenException("Not your ticket");
    if (ticket.status !== "NEW") throw new BadRequestException("Can only cancel NEW tickets");

    await this.db.update(tickets)
      .set({ status: "CANCELLED" as any })
      .where(eq(tickets.id, ticketId));

    return { success: true };
  }

  async markInProgress(ticketId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.status === "NEW" || ticket.status === "SM_REJECTED") {
      await this.db.update(tickets)
        .set({ status: "IN_PROGRESS" as any })
        .where(eq(tickets.id, ticketId));
    }
  }

  async close(ticketId: string, managerId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.assignedToId !== managerId) throw new ForbiddenException("Not your ticket");
    if (ticket.status !== "IN_PROGRESS" && ticket.status !== "SM_REJECTED") {
      throw new BadRequestException("Ticket must be IN_PROGRESS or SM_REJECTED to close");
    }

    const config = TICKET_TOPIC_CONFIG[ticket.topic];
    const newStatus = config.smReviewRequired ? "PENDING_SM_REVIEW" : "COMPLETED";

    await this.db.update(tickets)
      .set({ status: newStatus as any })
      .where(eq(tickets.id, ticketId));

    if (newStatus === "PENDING_SM_REVIEW") {
      await this.messagesService.createSystem(
        ticketId, managerId,
        "Менеджер закрыл тикет. Ожидание проверки.",
      );
    }

    // Notify user
    await this.notificationsService.create({
      userId: ticket.userId,
      type: NotificationType.TICKET,
      title: newStatus === "COMPLETED" ? "Тикет завершён" : "Тикет на проверке",
      body: newStatus === "COMPLETED" ? "Ваш вопрос решён." : "Тикет отправлен на проверку.",
      link: `/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(ticket.userId, { type: "ticket-updated", ticketId, status: newStatus });

    return { success: true, status: newStatus };
  }

  async approve(ticketId: string, smId: string, pointsAwarded: number) {
    const ticket = await this.getById(ticketId);
    if (ticket.status !== "PENDING_SM_REVIEW") {
      throw new BadRequestException("Ticket must be PENDING_SM_REVIEW");
    }

    await this.db.update(tickets)
      .set({
        status: "COMPLETED" as any,
        smReviewedById: smId,
        pointsAwarded,
      })
      .where(eq(tickets.id, ticketId));

    // Award points to user
    if (pointsAwarded > 0) {
      await this.db.execute(
        sql`UPDATE users SET friendship_points = friendship_points + ${pointsAwarded} WHERE id = ${ticket.userId}`
      );
    }

    const pointsMsg = pointsAwarded > 0 ? ` Начислено ${pointsAwarded} баллов дружбы.` : "";
    await this.messagesService.createSystem(
      ticketId, smId,
      `Тикет подтверждён.${pointsMsg}`,
    );

    await this.notificationsService.create({
      userId: ticket.userId,
      type: NotificationType.TICKET,
      title: "Тикет подтверждён",
      body: `Ваш тикет подтверждён.${pointsMsg}`,
      link: `/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(ticket.userId, { type: "ticket-updated", ticketId, status: "COMPLETED" });

    return { success: true };
  }

  async reject(ticketId: string, smId: string, reason: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.status !== "PENDING_SM_REVIEW") {
      throw new BadRequestException("Ticket must be PENDING_SM_REVIEW");
    }

    await this.db.update(tickets)
      .set({
        status: "SM_REJECTED" as any,
        smReviewedById: smId,
        smRejectionReason: reason,
      })
      .where(eq(tickets.id, ticketId));

    await this.messagesService.createSystem(
      ticketId, smId,
      `Тикет отклонён. Причина: ${reason}`,
    );

    // Notify assigned manager
    if (ticket.assignedToId) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        type: NotificationType.TICKET,
        title: "Тикет отклонён СМ",
        body: `Причина: ${reason}`,
        link: `/admin/tickets/${ticketId}`,
      });
      this.notificationsGateway.pushToUser(ticket.assignedToId, { type: "ticket-updated", ticketId, status: "SM_REJECTED" });
    }

    return { success: true };
  }

  private generateTitle(topic: string, userName: string): string {
    const titles: Record<string, string> = {
      PARK_CHECK: `Проверка Таксопарка`,
      USER_BASE_CHECK: `Проверка по БАЗЕ ${userName}`,
      TAXI_CONNECT: `${userName} Аренда`,
      BUYOUT: `ВЫКУП`,
      LEGAL: `Юридический вопрос ${userName}`,
      FRIENDSHIP_POINTS: `Баллы дружбы ${userName}`,
      OTHER: `Обращение ${userName}`,
    };
    return titles[topic] || `Тикет ${userName}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add tickets service with CRUD, status transitions, SM review, points"
```

---

## Task 6: Chat Gateway (Socket.IO /chat)

**Files:**
- Create: `apps/api/src/modules/tickets/chat.gateway.ts`

- [ ] **Step 1: Create chat.gateway.ts**

```ts
import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, users } from "@taxibrat/db";
import { MessagesService } from "./messages.service";

interface ChatUser {
  sub: string;
  role: string;
}

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private clientUsers = new Map<string, ChatUser>();

  constructor(
    private config: ConfigService,
    @Inject("DATABASE") private db: Database,
    private messagesService: MessagesService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) { client.disconnect(); return; }

      const payload = verify(token, this.config.get("JWT_SECRET")!) as ChatUser;
      this.clientUsers.set(client.id, payload);
      this.logger.log(`Chat: ${client.id} connected (user ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clientUsers.delete(client.id);
    this.logger.log(`Chat: ${client.id} disconnected`);
  }

  @SubscribeMessage("join-ticket")
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user) return;

    // Verify access
    const [ticket] = await this.db.select().from(tickets)
      .where(eq(tickets.id, data.ticketId)).limit(1);

    if (!ticket) return;

    const canAccess =
      user.role === "ADMIN" ||
      user.role === "SUPER_MANAGER" ||
      ticket.userId === user.sub ||
      ticket.assignedToId === user.sub;

    if (!canAccess) return;

    client.join(`ticket:${data.ticketId}`);
    this.logger.log(`User ${user.sub} joined ticket:${data.ticketId}`);
  }

  @SubscribeMessage("send-message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; body: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user || !data.body?.trim()) return;

    // Save to DB
    const message = await this.messagesService.create(data.ticketId, user.sub, data.body.trim());

    // Get sender info
    const [sender] = await this.db.select({
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    }).from(users).where(eq(users.id, user.sub)).limit(1);

    const senderName = sender?.firstName && sender?.lastName
      ? `${sender.firstName} ${sender.lastName.charAt(0)}.`
      : "Пользователь";

    // Broadcast to room
    this.server.to(`ticket:${data.ticketId}`).emit("new-message", {
      id: message.id,
      ticketId: data.ticketId,
      senderId: user.sub,
      senderName,
      senderRole: sender?.role || user.role,
      body: message.body,
      isSystem: false,
      createdAt: message.createdAt.toISOString(),
    });
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user) return;

    client.to(`ticket:${data.ticketId}`).emit("user-typing", {
      ticketId: data.ticketId,
      userId: user.sub,
    });
  }

  @SubscribeMessage("leave-ticket")
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.leave(`ticket:${data.ticketId}`);
  }

  // Called by TicketsService for system messages
  emitToTicket(ticketId: string, event: string, payload: unknown) {
    this.server.to(`ticket:${ticketId}`).emit(event, payload);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add chat gateway with Socket.IO /chat namespace"
```

---

## Task 7: Tickets Controllers (User + Admin)

**Files:**
- Create: `apps/api/src/modules/tickets/tickets.controller.ts`
- Create: `apps/api/src/modules/tickets/tickets.admin.controller.ts`

- [ ] **Step 1: Create tickets.controller.ts**

```ts
import {
  Controller, Get, Post, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TicketsService } from "./tickets.service";
import { MessagesService } from "./messages.service";
import {
  createTicketSchema, listTicketsSchema, sendMessageSchema,
  CreateTicketDto, ListTicketsDto, SendMessageDto,
} from "@taxibrat/shared";

@Controller("tickets")
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private messagesService: MessagesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createTicketSchema)) dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(user.sub, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto,
  ) {
    return this.ticketsService.listForUser(user.sub, dto);
  }

  @Get(":id")
  async getById(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const ticket = await this.ticketsService.getById(id);
    const messages = await this.messagesService.listByTicket(id, 1, 50);
    return { ...ticket, messages };
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ticketsService.cancel(id, user.sub);
  }

  @Post(":id/messages")
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.create(id, user.sub, dto.body);
  }

  @Get(":id/messages")
  listMessages(
    @Param("id") id: string,
    @Query("page") page = "1",
    @Query("limit") limit = "50",
  ) {
    return this.messagesService.listByTicket(id, parseInt(page), Math.min(parseInt(limit), 100));
  }
}
```

- [ ] **Step 2: Create tickets.admin.controller.ts**

```ts
import {
  Controller, Get, Post, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TicketsService } from "./tickets.service";
import { MessagesService } from "./messages.service";
import {
  UserRole, listTicketsSchema, sendMessageSchema, rejectTicketSchema, approveTicketSchema,
  ListTicketsDto, SendMessageDto, RejectTicketDto, ApproveTicketDto,
} from "@taxibrat/shared";

@Controller("admin/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsAdminController {
  constructor(
    private ticketsService: TicketsService,
    private messagesService: MessagesService,
  ) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto,
  ) {
    return this.ticketsService.listForManager(user.sub, dto);
  }

  @Get("review")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  listForReview(@Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto) {
    return this.ticketsService.listForSmReview(dto);
  }

  @Get(":id")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  async getById(@Param("id") id: string) {
    const ticket = await this.ticketsService.getById(id);
    await this.ticketsService.markInProgress(id);
    const messages = await this.messagesService.listByTicket(id, 1, 50);
    return { ...ticket, messages };
  }

  @Post(":id/messages")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.create(id, user.sub, dto.body);
  }

  @Post(":id/close")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  close(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ticketsService.close(id, user.sub);
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  approve(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(approveTicketSchema)) dto: ApproveTicketDto,
  ) {
    return this.ticketsService.approve(id, user.sub, dto.pointsAwarded);
  }

  @Post(":id/reject")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  reject(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectTicketSchema)) dto: RejectTicketDto,
  ) {
    return this.ticketsService.reject(id, user.sub, dto.reason);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add ticket controllers — user CRUD and admin/SM review endpoints"
```

---

## Task 8: Tickets Module + Wire Up

**Files:**
- Create: `apps/api/src/modules/tickets/tickets.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/package.json` (if @nestjs/schedule not already added)

- [ ] **Step 1: Create tickets.module.ts**

```ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TicketsController } from "./tickets.controller";
import { TicketsAdminController } from "./tickets.admin.controller";
import { TicketsService } from "./tickets.service";
import { TicketDistributorService } from "./ticket-distributor.service";
import { MessagesService } from "./messages.service";
import { ChatGateway } from "./chat.gateway";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [TicketsController, TicketsAdminController],
  providers: [
    TicketsService,
    TicketDistributorService,
    MessagesService,
    ChatGateway,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
```

- [ ] **Step 2: Update app.module.ts**

Add import:
```ts
import { TicketsModule } from "./modules/tickets/tickets.module";
```
Add `TicketsModule` to the imports array.

- [ ] **Step 3: Build and test**

```bash
cd apps/api && npx nest build
pnpm test
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire up tickets module with chat, distribution, and SM review"
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Shared enums, DTOs, constants | `feat: add ticket enums, DTOs, and topic config constants` |
| 2 | DB schema — 3 tables | `feat: add ticket database schema — tickets, messages, buffer tables` |
| 3 | Messages service | `feat: add ticket messages service with CRUD` |
| 4 | Ticket distributor (round-robin + cron) | `feat: add ticket distributor with round-robin and cron buffer drain` |
| 5 | Tickets service (CRUD + status + points) | `feat: add tickets service with CRUD, status transitions, SM review, points` |
| 6 | Chat gateway (Socket.IO /chat) | `feat: add chat gateway with Socket.IO /chat namespace` |
| 7 | Controllers (user + admin) | `feat: add ticket controllers — user CRUD and admin/SM review endpoints` |
| 8 | Module + wire up | `feat: wire up tickets module with chat, distribution, and SM review` |
