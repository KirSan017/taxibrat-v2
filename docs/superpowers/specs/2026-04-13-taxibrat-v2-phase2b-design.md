# TaxiBrat v2 — Phase 2b: Ticket System + Real-time Chat

> Spec date: 2026-04-13
> Depends on: Phase 1 (auth, users, roles, notifications) + Phase 2a (parks, rating)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Universal ticket system with real-time chat for all user-manager interactions: park verification, base checks, taxi connections, buyout, legal questions, etc. Includes round-robin ticket distribution, buffer for offline managers, SM review of closed tickets, and friendship points awards.

"По делам, без 9%" (taxi orders with timers/auto-block) is deferred to Phase 3 due to unique mechanics.

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Chat storage | PostgreSQL + Socket.IO push | Simple, reliable for our scale |
| Distribution | Round-robin via Redis counter | Predictable, fast, Redis already in stack |
| Buffer drain | Cron every 15 min, 1 ticket at a time | Per ТЗ requirement to avoid flooding one manager |
| SM review | Extended status flow (PENDING_SM_REVIEW) | Single table, matches ТЗ exactly |
| Chat transport | Separate Socket.IO namespace /chat | Isolated from /notifications, room-per-ticket |
| "По делам, без 9%" | Deferred to Phase 3 | Unique timer/auto-block mechanics |

## Database Schema

### tickets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users, ticket creator |
| assignedToId | uuid | FK → users, nullable (null = in buffer) |
| topic | enum | PARK_CHECK, USER_BASE_CHECK, TAXI_CONNECT, BUYOUT, LEGAL, FRIENDSHIP_POINTS, OTHER |
| title | varchar(300) | Auto-generated from topic + entity name |
| status | enum | NEW, IN_PROGRESS, PENDING_SM_REVIEW, SM_REJECTED, COMPLETED, CANCELLED |
| relatedEntityType | enum | PARK, PARK_CLASS, VEHICLE, USER, nullable |
| relatedEntityId | uuid | nullable, polymorphic reference |
| smReviewedById | uuid | FK → users, nullable |
| smRejectionReason | text | nullable, filled by SM on reject |
| pointsAwarded | int | default 0, set by SM on approve |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### ticket_messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| ticketId | uuid | FK → tickets, ON DELETE CASCADE |
| senderId | uuid | FK → users |
| body | text | message content |
| isSystem | boolean | default false, system-generated messages |
| createdAt | timestamptz | |

### ticket_buffer
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| ticketId | uuid | FK → tickets, UNIQUE |
| section | enum | ManagerSection (CHAT, TAXI_CHECK, BUYOUT, etc.) |
| createdAt | timestamptz | for FIFO ordering |

## Topic → Section Mapping

| Topic | ManagerSection | SM Review Required | Points on Approve |
|-------|---------------|:-:|:-:|
| PARK_CHECK | TAXI_CHECK | yes | 150 |
| USER_BASE_CHECK | CHAT | yes | 0 (paid service) |
| TAXI_CONNECT | CHAT | yes | 150 |
| BUYOUT | BUYOUT (→ SM directly) | no | 0 |
| LEGAL | CHAT | no | 0 |
| FRIENDSHIP_POINTS | CHAT | no | 0 |
| OTHER | CHAT | no | 0 |

## Ticket Lifecycle

### Status Flow
```
NEW → IN_PROGRESS → PENDING_SM_REVIEW → COMPLETED
                                      → SM_REJECTED → IN_PROGRESS → ...
NEW → CANCELLED (user cancels before assignment)

For topics without SM review:
NEW → IN_PROGRESS → COMPLETED (manager closes directly)
```

### Triggers
- **User creates ticket** → status NEW, assign or buffer
- **Manager opens ticket** → status IN_PROGRESS (first time entering chat)
- **Manager clicks "Вопрос решён"** → PENDING_SM_REVIEW (if SM review required) or COMPLETED
- **SM approves** → COMPLETED + award friendship points + notification to user
- **SM rejects** → SM_REJECTED + reason → notification to manager
- **Manager re-resolves after rejection** → PENDING_SM_REVIEW again
- **User cancels** → CANCELLED (only from NEW status)

### Auto-generated Titles
| Topic | Title Format |
|-------|-------------|
| PARK_CHECK | "Проверка Таксопарка {parkName}" |
| USER_BASE_CHECK | "Проверка по БАЗЕ {lastName} {firstName}" |
| TAXI_CONNECT | "{lastName} {firstName} Аренда в {parkName} {class}" |
| BUYOUT | "ВЫКУП {brand} {model} {year}" |
| LEGAL | "Юридический вопрос {lastName} {firstName}" |
| FRIENDSHIP_POINTS | "Баллы дружбы {lastName} {firstName}" |
| OTHER | "Обращение {lastName} {firstName}" |

## Ticket Distribution

### Assignment Algorithm
```
1. Map topic → section
   Exception: BUYOUT → assign directly to SM (not regular manager)

2. Get active managers for section:
   SELECT userId FROM manager_settings
   WHERE section = :section AND workStatus = 'WORKING'

3. If active managers exist:
   - Redis INCR round_robin:{section}
   - index = counter % activeManagers.length
   - assignedToId = activeManagers[index].userId
   - Create system message: "Тикет назначен на {managerName}"
   - WS push to manager (notification) + user (ticket created)

4. If no active managers:
   - assignedToId = null
   - INSERT INTO ticket_buffer (ticketId, section)
   - Create system message: "Все менеджеры сейчас недоступны. Ваш запрос в очереди."
```

### Buffer Drain (Cron every 15 minutes)
```
For each section:
  1. Get active managers with workStatus = WORKING
  2. If none → skip
  3. Get oldest ticket from ticket_buffer for this section (FIFO)
  4. If none → skip
  5. Assign to next round-robin manager
  6. Remove from ticket_buffer
  7. Update ticket.assignedToId
  8. Create system message
  9. WS push to manager
```

## Real-time Chat (Socket.IO)

### Namespace: /chat

**Connection:**
- Client sends JWT in `auth.token`
- Server verifies JWT, extracts userId and role
- On invalid token → disconnect

**Events (client → server):**

| Event | Payload | Action |
|-------|---------|--------|
| join-ticket | { ticketId } | Verify access, join room `ticket:{ticketId}` |
| send-message | { ticketId, body } | Save to DB, emit to room |
| typing | { ticketId } | Forward to room (not saved) |
| leave-ticket | { ticketId } | Leave room |

**Events (server → client):**

| Event | Payload | When |
|-------|---------|------|
| new-message | { id, ticketId, senderId, senderName, senderRole, body, isSystem, createdAt } | Message sent by anyone in ticket |
| user-typing | { ticketId, userId, userName } | Other user typing |
| ticket-updated | { ticketId, status, ... } | Status change |

**Room Access Control:**
- USER: only own tickets (`ticket.userId === user.sub`)
- MANAGER: only assigned tickets (`ticket.assignedToId === user.sub`)
- SUPER_MANAGER, ADMIN: any ticket

### System Messages (isSystem: true)
Created automatically, pushed via same channel:
- "Тикет назначен на менеджера {name}"
- "Менеджер закрыл тикет. Ожидание проверки."
- "Тикет подтверждён. Начислено {n} баллов дружбы."
- "Тикет отклонён. Причина: {reason}"

## API Endpoints

### User Endpoints
- `POST /api/tickets` — create ticket { topic, relatedEntityType?, relatedEntityId?, body }
- `GET /api/tickets` — my tickets (page, limit, topic?, status?)
- `GET /api/tickets/:id` — ticket detail + last messages
- `POST /api/tickets/:id/cancel` — cancel (only from NEW)
- `POST /api/tickets/:id/messages` — send message
- `GET /api/tickets/:id/messages` — message history (page, limit)

### Manager Endpoints
- `GET /api/admin/tickets` — my assigned tickets (page, limit, topic?, status?)
- `GET /api/admin/tickets/:id` — ticket detail + messages
- `POST /api/admin/tickets/:id/messages` — reply
- `POST /api/admin/tickets/:id/close` — close ticket → PENDING_SM_REVIEW or COMPLETED

### SM Endpoints
- `GET /api/admin/tickets/review` — tickets awaiting SM review (PENDING_SM_REVIEW)
- `POST /api/admin/tickets/:id/approve` — approve + award points
- `POST /api/admin/tickets/:id/reject` — reject { reason }

## NestJS Module Structure

```
apps/api/src/modules/tickets/
├── tickets.module.ts
├── tickets.controller.ts           # user endpoints
├── tickets.admin.controller.ts     # manager + SM endpoints
├── tickets.service.ts              # CRUD, status transitions, points
├── ticket-distributor.service.ts   # round-robin + buffer + cron
├── messages.service.ts             # message CRUD
└── chat.gateway.ts                 # Socket.IO /chat namespace
```

### Dependencies
- `tickets` → `auth` (DATABASE, REDIS providers)
- `tickets` → `notifications` (push on status change)
- `tickets` → `managers` (check workStatus for distribution)
- New dependency: `@nestjs/schedule` for cron buffer drain

## What Phase 2b Does NOT Include
- "По делам, без 9%" orders (unique timer/auto-block mechanics) → Phase 3
- Friendship points economy (configurable amounts by admin) → Phase 3
- Referral program → Phase 3
- News system → Phase 3
- Manager statistics → Phase 3
- Duplicate detection for parks → Phase 3
- User-submitted park additions (form → ticket is here, but park creation from ticket → Phase 3)
