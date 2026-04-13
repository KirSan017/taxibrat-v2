# TaxiBrat v2 — Phase 1: Foundation

> Spec date: 2026-04-13
> Source: ТЗ Таксибрат - Киберия.docx + Figma (pending token)

## Overview

Full rebuild of TaxiBrat from scratch as a SaaS platform for taxi drivers.
Phase 1 covers: monorepo setup, auth, user profiles, roles, admin panel, notifications, audit log.

Phases 2-3 (taxi parks, rating, tickets, chat, orders, buyout, referral) will be separate specs.

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Monorepo | Turborepo + pnpm | Fast builds, caching, good Next.js support |
| Frontend | Next.js 16 (App Router) | SSR, TypeScript, pixel-perfect Figma |
| Backend | NestJS | Modules, guards, interceptors, WebSocket support |
| ORM | Drizzle | SQL-first, fast on complex aggregations (rating system) |
| Database | PostgreSQL 17 | Robust, jsonb for audit, full-text search |
| Cache/Sessions | Redis 7 | JWT whitelist, queues, ticket buffer |
| Real-time | Socket.IO | Chat + notifications, rooms, auto-reconnect |
| SMS | Exolve + Telegram Gateway | Primary SMS + free Telegram alternative |
| Auth | Passport.js + JWT + Redis | Stateless API + instant token revocation |
| Deploy | Docker Compose + Nginx | Single VPS, Certbot SSL |
| UI | shadcn/ui + Tailwind CSS | Pixel-perfect from Figma, component library |
| Icons | Lucide | As specified in ТЗ |

## Monorepo Structure

```
taxibrat/
├── apps/
│   ├── web/                  # Next.js 16 (frontend, SSR)
│   │   ├── src/
│   │   │   ├── app/          # App Router pages
│   │   │   ├── components/   # UI components
│   │   │   ├── lib/          # API client, hooks
│   │   │   └── styles/
│   │   └── next.config.ts
│   └── api/                  # NestJS (backend)
│       ├── src/
│       │   ├── modules/      # auth, users, parks, tickets...
│       │   ├── common/       # guards, interceptors, pipes
│       │   ├── config/       # env validation
│       │   └── main.ts
│       └── nest-cli.json
├── packages/
│   ├── shared/               # DTOs, types, constants
│   ├── db/                   # Drizzle schema, migrations
│   └── config/               # eslint, tsconfig base
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Database Schema (Phase 1)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| phone | varchar(20) | UNIQUE, NOT NULL |
| firstName | varchar(100) | nullable until profile filled |
| lastName | varchar(100) | nullable |
| patronymic | varchar(100) | nullable |
| email | varchar(255) | UNIQUE, nullable |
| birthDate | date | nullable |
| photoUrl | varchar(500) | nullable |
| role | enum | USER, MANAGER, SUPER_MANAGER, ADMIN |
| status | enum | PHONE_VERIFIED, PENDING_REVIEW, ACTIVE, REJECTED, BANNED |
| friendshipPoints | int | default 0 (display adds +615 offset) |
| referralCode | varchar(20) | UNIQUE, auto-generated |
| referredById | uuid | FK → users, nullable |
| rejectionReason | text | nullable, filled by manager on reject |
| createdAt | timestamptz | default now() |
| updatedAt | timestamptz | auto-update |

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| refreshTokenHash | varchar(255) | bcrypt hash of refresh token |
| expiresAt | timestamptz | 3 months from creation |
| createdAt | timestamptz | |

### verification_codes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| phone | varchar(20) | |
| code | varchar(6) | 6-digit code |
| method | enum | SMS, TELEGRAM |
| expiresAt | timestamptz | 5 min TTL |
| attempts | int | max 3, then regenerate |
| createdAt | timestamptz | |

### manager_settings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users (MANAGER/SUPER_MANAGER) |
| section | enum | CHAT, TAXI_CHECK, NO_9_PERCENT, USERS, BUYOUT |
| workStatus | enum | WORKING, RESTING |
| fiveMinCount | int | reset when all tickets closed |

### audit_log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| actorId | uuid | FK → users |
| action | enum | CREATE, UPDATE, DELETE, STATUS_CHANGE |
| entity | enum | USER, PARK, CAR, TICKET, POINTS |
| entityId | uuid | |
| oldValue | jsonb | nullable |
| newValue | jsonb | nullable |
| createdAt | timestamptz | |

### notifications
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| type | enum | SYSTEM, TICKET, POINTS, NEWS |
| title | varchar(255) | |
| body | text | |
| link | varchar(500) | nullable |
| isRead | boolean | default false |
| createdAt | timestamptz | |

## NestJS Modules (Phase 1)

### auth/
- `POST /auth/send-code` — send verification code (SMS or Telegram)
- `POST /auth/verify` — verify code, return JWT access + refresh
- `POST /auth/refresh` — refresh access token
- `POST /auth/logout` — invalidate refresh token in Redis
- Providers: ExolveProvider (SMS), TelegramProvider (Gateway)
- JWT access token: 15 min TTL
- Refresh token: 3 months, stored as hash in `sessions` + whitelist in Redis

### users/
- `GET /users/me` — current user profile
- `PATCH /users/me` — update profile, status → PENDING_REVIEW
- `POST /users/me/photo` — upload photo (camera capture)
- `GET /admin/users` — list users with filters (admin/manager)
- `POST /admin/users/:id/approve` — approve profile
- `POST /admin/users/:id/reject` — reject with reason
- `POST /admin/users/:id/impersonate` — admin logs in as user
- Duplicate detection: exact match on phone/email (block), fuzzy on firstName+lastName (warn manager)

### managers/
- `GET /managers/settings` — get current work statuses by section
- `PATCH /managers/settings/:section` — toggle WORKING/RESTING
- Used by ticket distribution logic in Phase 2

### notifications/
- `GET /notifications` — paginated list, unread first
- `PATCH /notifications/:id/read` — mark as read
- `PATCH /notifications/read-all` — mark all as read
- Socket.IO gateway: pushes to room `user:{userId}` on creation

### audit/
- AuditInterceptor: auto-logs CREATE/UPDATE/DELETE on decorated endpoints
- `GET /admin/audit` — search audit log (admin/SM only)

### health/
- `GET /health` — Docker healthcheck endpoint

## Auth Flow

1. User enters phone → `POST /auth/send-code { phone, method: "SMS" }`
2. API generates 6-digit code, saves to `verification_codes` (5 min TTL, max 3 attempts)
3. Sends via Exolve SMS or Telegram Gateway
4. User enters code → `POST /auth/verify { phone, code }`
5. API validates code + attempts count
6. If user doesn't exist → creates with status PHONE_VERIFIED
7. Generates JWT access (15 min) + refresh (3 months)
8. Stores refresh hash in `sessions` + Redis whitelist
9. Returns `{ accessToken, refreshToken, user, isNewUser }`
10. If `isNewUser`, frontend shows "Fill profile for 100 points" prompt
11. User fills profile → `PATCH /users/me` → status becomes PENDING_REVIEW
12. Manager receives review task, approves/rejects
13. On approve: status → ACTIVE, +100 friendship points, notification via WebSocket

### Token Revocation
- Ban user: delete all their refresh tokens from Redis → access expires in ≤15 min
- Admin impersonation: generates JWT with `impersonatedBy` field, logged in audit

## Docker Compose

```yaml
services:
  api:          # NestJS on :3000
  web:          # Next.js on :3001
  postgres:     # PostgreSQL 17 on :5432 (loopback only)
  redis:        # Redis 7 on :6379 (loopback only)
  nginx:        # Reverse proxy on :80/:443
```

### Nginx Routing
- `taxibrat.ru` → `web:3001` (Next.js SSR)
- `taxibrat.ru/api/*` → `api:3000` (NestJS REST)
- `taxibrat.ru/ws` → `api:3000` (Socket.IO WebSocket upgrade)

### SSL
- Certbot with auto-renewal cron
- HTTP → HTTPS redirect

### VPS Requirements
- 2 vCPU, 4 GB RAM, 40 GB SSD minimum
- Ubuntu 24.04
- Docker + Docker Compose

### Deploy Process (Phase 1 — manual)
```bash
git push origin main
ssh user@vps "cd /opt/taxibrat && git pull && docker compose build && docker compose up -d"
```

## What Phase 1 Does NOT Include
- Taxi parks catalog, rating system → Phase 2
- Ticket system, chat → Phase 2
- "No 9%" orders → Phase 3
- Car buyout → Phase 3
- Friendship points economy (beyond registration bonus) → Phase 3
- Referral program → Phase 3
- Manager statistics → Phase 3
- News system → Phase 3
- Figma pixel-perfect UI (waiting for API token) → applied across all phases
