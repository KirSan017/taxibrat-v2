# TaxiBrat v2 — Phase 3c: "По делам, без 9%" Orders

> Spec date: 2026-04-14
> Depends on: Phase 1 (auth, managers), Phase 3a (points, settings)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Taxi ordering system where users create ride requests, managers process them with special controls (5-min delay, auto-block). Not a regular ticket — separate table with unique timer/blocking mechanics.

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Separate from tickets | Own `no9_orders` table | Unique mechanics (timers, 5-min, auto-block) don't fit ticket model |
| Timer tracking | Store timestamps, compute on read | No cron needed for per-order timers |
| Auto-block | Check fiveMinCount in manager_settings | Already exists from Phase 1 |

## Database Schema

### no9_orders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| assignedToId | uuid | FK → users, nullable |
| pointFrom | varchar(500) | Address A |
| pointTo | varchar(500) | Address B |
| status | enum | PENDING, ORDERED, BANNED, CANCELLED, EXPIRED |
| assignedAt | timestamptz | nullable, when assigned to manager (timer start) |
| completedAt | timestamptz | nullable, when manager clicked Ordered/Banned |
| fiveMinCount | int | default 0, per this order |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

## Status Flow

```
PENDING → (assigned to manager) → manager clicks:
  "Заказан"  → ORDERED (user notified, +completedAt)
  "Упс, бан" → BANNED (user notified as shadow ban, +completedAt)
  "5 мин"    → stays PENDING (user notified "подождите 5 мин", fiveMinCount++)

PENDING → user cancels (within 10 min) → CANCELLED (charge 15 points)
PENDING → no action 30 min → EXPIRED
```

## Auto-block Logic

Per ТЗ: if a manager clicks "5 мин" 3 times across ALL their unclosed orders, they stop receiving new no9 orders.

```
On "5 мин" click:
  1. order.fiveMinCount++
  2. manager_settings[NO_9_PERCENT].fiveMinCount++
  3. If manager_settings.fiveMinCount >= 3:
     - This manager no longer receives no9 orders
     - Check if ALL managers in NO_9_PERCENT section have fiveMinCount >= 3
     - If yes → feature auto-disabled, users see "попробуйте через 20 мин"

On order completion (ORDERED/BANNED):
  1. Check if manager has 0 unclosed orders
  2. If yes → reset manager_settings.fiveMinCount = 0 → manager available again
```

## Feature Toggle

- `service_settings.no9_enabled` — admin can enable/disable
- Auto-disabled when all managers blocked (re-enabled when any manager clears their queue)
- Users see: "Функция временно недоступна. Попробуйте через 20 минут."

## Points

- Order creation: charge `settings.points_order_no9_cost` (default 50)
- Order cancellation: charge `settings.points_order_cancel_cost` (default 15)
- User must have full profile (all required fields filled)

## Distribution

Same round-robin as tickets but only among NO_9_PERCENT section managers with fiveMinCount < 3.

## Timer Tracking

- `assignedAt` = when order assigned to manager
- `completedAt` = when ORDERED or BANNED
- Response time = `completedAt - assignedAt` (used in Phase 3d statistics)
- "5 мин" does NOT reset timer

## API Endpoints

### User
- `POST /api/orders/no9` — create order { pointFrom, pointTo }
- `GET /api/orders/no9` — my orders (page, limit)
- `POST /api/orders/no9/:id/cancel` — cancel (within 10 min of creation, charges 15 points)

### Manager
- `GET /api/admin/orders/no9` — my assigned orders
- `POST /api/admin/orders/no9/:id/ordered` — "Заказан"
- `POST /api/admin/orders/no9/:id/banned` — "Упс, бан"
- `POST /api/admin/orders/no9/:id/five-min` — "5 мин"

### Admin
- `GET /api/admin/orders/no9/status` — feature status (enabled, blocked managers count)

## NestJS Module

```
apps/api/src/modules/orders/
├── orders.module.ts
├── orders.controller.ts           # user endpoints
├── orders.admin.controller.ts     # manager + admin
├── orders.service.ts              # CRUD, status, auto-block
└── orders.distributor.ts          # round-robin for no9 (reuses pattern from tickets)
```
