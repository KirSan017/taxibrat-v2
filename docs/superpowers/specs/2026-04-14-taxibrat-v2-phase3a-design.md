# TaxiBrat v2 — Phase 3a: Friendship Points + News + Admin Settings

> Spec date: 2026-04-14
> Depends on: Phase 1 (auth, users, notifications) + Phase 2b (tickets)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Full friendship points economy with transaction history, configurable admin settings (key-value), and news system with push notifications. This phase is the foundation for Phases 3b-3d (buyout, orders, referrals).

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Points history | `points_transactions` table + cached balance | ТЗ requires history in ЛК, cached balance for fast checks |
| Settings | Key-value `service_settings` table | Flexible, no migrations for new settings |
| News | `news` table + mass notification insert | Separate CRUD + existing notifications for delivery |
| News files | URL links only (no file upload) | MVP simplicity, upload later |

## Database Schema

### points_transactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| amount | int | positive = credit, negative = debit |
| type | enum | REGISTRATION, PARK_CHECK, TAXI_CONNECT, BUYOUT, REFERRAL, ORDER_NO9, ORDER_CANCEL, BASE_CHECK, MANUAL_ADMIN, IDEA |
| description | varchar(300) | human-readable description |
| relatedTicketId | uuid | FK → tickets, nullable |
| createdById | uuid | FK → users, nullable (admin for manual) |
| createdAt | timestamptz | |

### service_settings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| key | varchar(100) | UNIQUE |
| value | text | string representation |
| updatedAt | timestamptz | |

### news
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | varchar(300) | |
| body | text | HTML/markdown with links |
| linkUrl | varchar(500) | nullable, external link |
| isPublished | boolean | default true |
| createdById | uuid | FK → users |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

## Seed Data: service_settings

| Key | Default | Description |
|-----|---------|-------------|
| points_registration | 100 | Registration + profile bonus |
| points_park_check | 150 | Successful park verification |
| points_taxi_connect | 150 | Successful taxi connection |
| points_buyout | 1000 | Successful car buyout |
| points_idea | 50 | Accepted idea |
| points_referral_register | 200 | Referral bonus (inviter) |
| points_referral_bonus | 100 | Referral bonus (invitee) |
| points_base_check_cost | 50 | Cost: check by taxi park database |
| points_order_no9_cost | 50 | Cost: "По делам, без 9%" order |
| points_order_cancel_cost | 15 | Cost: cancel order |
| no9_enabled | true | Enable/disable "По делам" feature |
| banner_url | | Banner image URL (1400x400px) |
| points_review_enabled | false | Show points review info block |
| points_review_date | | Next review date |

## Points Service

### Core Methods
- `award(userId, amount, type, description, ticketId?)` — credit points, create transaction, update balance, WS notify
- `charge(userId, amount, type, description)` — debit points, verify balance >= amount, throw if insufficient
- `manualAdjust(adminId, userId, amount, description)` — admin manual +/-, type MANUAL_ADMIN, audit logged
- `getBalance(userId)` — returns `users.friendshipPoints` (display adds +615 offset on frontend)
- `getHistory(userId, page, limit)` — paginated transaction list
- `getLeaderboard(limit)` — users sorted by balance DESC

### Integration with Existing Modules
- `TicketsService.approve()` → calls `pointsService.award()` instead of direct SQL (refactor)
- `TicketsService.create()` with topic USER_BASE_CHECK → calls `pointsService.charge(settingsService.getNumber("points_base_check_cost"))` 
- `UsersService.approveUser()` → calls `pointsService.award()` for registration bonus (refactor)
- All point amounts read from `SettingsService` (not hardcoded)

## Settings Service

### Core Methods
- `get(key)` — Redis cache (TTL 5 min) → DB fallback
- `getNumber(key, defaultValue)` — parsed number
- `getBoolean(key)` — "true" check
- `set(key, value)` — update DB + invalidate Redis
- `getAll()` — all settings for admin page
- `getPointsConfig()` — all points_* settings as typed object

## News Service

### Core Methods
- `create(title, body, linkUrl, createdById)` — insert news + mass-create notifications for all ACTIVE users + WS push
- `list(page, limit)` — published only, public
- `listAdmin(page, limit)` — all including unpublished
- `update(id, data)` — SM/admin
- `delete(id)` — admin only

### Mass Notification Strategy
On news creation, bulk INSERT into notifications for all users with status ACTIVE:
```sql
INSERT INTO notifications (user_id, type, title, body, link)
SELECT id, 'NEWS', :title, :body, '/news/:newsId'
FROM users WHERE status = 'ACTIVE'
```
Then WS broadcast to all connected clients.

## API Endpoints

### Points — User
- `GET /api/points/balance` — my balance (with +615 display offset)
- `GET /api/points/history` — my transaction history (page, limit)

### Points — Admin
- `POST /api/admin/points/adjust` — manual adjust { userId, amount, description }
- `GET /api/admin/points/leaderboard` — top users by balance (page, limit)

### Settings — Admin only
- `GET /api/admin/settings` — all settings
- `PATCH /api/admin/settings` — update settings { updates: [{ key, value }] }

### News — Public
- `GET /api/news` — published news (page, limit)
- `GET /api/news/:id` — single news item

### News — Admin/SM
- `POST /api/admin/news` — create + broadcast
- `GET /api/admin/news` — all news (page, limit)
- `PATCH /api/admin/news/:id` — update
- `DELETE /api/admin/news/:id` — delete (admin only)

## NestJS Modules

### points/
- `PointsService` — award, charge, manualAdjust, history, leaderboard
- `PointsController` — user endpoints (balance, history)
- `PointsAdminController` — admin endpoints (adjust, leaderboard)
- `@Global()` — used by tickets and users modules

### settings/
- `SettingsService` — get/set with Redis cache
- `SettingsController` — admin CRUD
- `@Global()` — used by points (amounts), tickets (feature flags), news

### news/
- `NewsService` — CRUD + mass notification
- `NewsController` — public list + admin CRUD

## Refactoring Required
- `TicketsService.approve()` — replace direct SQL points update with `pointsService.award()`
- `TicketsService.create()` — add `pointsService.charge()` for paid topics (USER_BASE_CHECK)
- `UsersService.approveUser()` — replace hardcoded 100 points with `pointsService.award(settingsService.getNumber("points_registration"))`
- Remove `POINTS.REGISTRATION_BONUS` constant (now in service_settings)

## What Phase 3a Does NOT Include
- "По делам, без 9%" orders → Phase 3c
- Car buyout → Phase 3b
- Referral program (referral links, bonus tracking) → Phase 3d
- Manager statistics → Phase 3d
- File upload for news → future
