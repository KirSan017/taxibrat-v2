# TaxiBrat v2 — Phase 3d: Referral Program + Manager Statistics

> Spec date: 2026-04-14
> Depends on: Phase 1 (users with referralCode), Phase 3a (points), Phase 2b (tickets), Phase 3c (orders)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Referral program with unique invite links and cascading bonuses. Manager statistics dashboard with response times, ticket counts, and time-based filtering.

## Part 1: Referral Program

### Database Schema

#### referral_events
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| inviterId | uuid | FK → users (who shared the link) |
| inviteeId | uuid | FK → users (who registered) |
| eventType | enum | REGISTRATION, RENTAL, BUYOUT |
| inviterPointsAwarded | int | points given to inviter |
| inviteePointsAwarded | int | points given to invitee |
| relatedTicketId | uuid | FK → tickets, nullable |
| createdAt | timestamptz | |

### Referral Flow

1. User shares link: `taxibrat.ru/r/{referralCode}`
2. New user registers via link → `users.referredById = inviter.id`
3. On full registration approval (status ACTIVE):
   - Inviter gets `settings.points_referral_register` (200) points
   - Invitee gets `settings.points_referral_bonus` (100) points
   - Record in `referral_events` (type: REGISTRATION)
4. On first successful rental ticket (COMPLETED):
   - Inviter gets bonus (one-time per referral)
   - Record in `referral_events` (type: RENTAL)
5. On first successful buyout ticket (COMPLETED):
   - Inviter gets bonus (one-time per referral)
   - Record in `referral_events` (type: BUYOUT)

### Visibility
- User ЛК: list of invited friends, earned bonuses
- Points history already shows referral transactions

### API Endpoints

```
GET /api/referrals/my-link          ← get my referral link + code
GET /api/referrals/friends          ← list of invited users + their status
GET /api/referrals/stats            ← total invited, total earned
```

### Integration
- `UsersService.approveUser()` → check if user has `referredById`, award referral bonuses
- `TicketsService.approve()` → check if RENTAL/BUYOUT + user has referrer + first time → award

## Part 2: Manager Statistics

### No new tables needed — aggregation from existing data:
- `tickets` — count, status, timestamps
- `ticket_messages` — first response time
- `no9_orders` — assignedAt, completedAt for response time
- `users` — manager info

### Statistics Per Manager (SM/Admin can view)

| Metric | Source | Calculation |
|--------|--------|-------------|
| Park verifications | tickets WHERE topic=PARK_CHECK AND assignedToId=manager | received vs completed |
| User profile reviews | tickets WHERE topic relates to user check | received vs completed |
| Base checks | tickets WHERE topic=USER_BASE_CHECK | received vs completed |
| No9 orders | no9_orders WHERE assignedToId=manager | total, by response time buckets |
| First response time | ticket_messages | time between ticket assignment and first manager message |
| SM rejections | tickets WHERE status was SM_REJECTED AND assignedToId=manager | count of rework |

### No9 Response Time Buckets
- < 1 min
- 1-2 min
- 2-3 min
- 3+ min

### Chat First Response Buckets
- < 30 sec
- 30 sec - 1 min
- > 1 min

### Time Filters
- Preset: today, last week, last month, all time
- Custom: date from, date to

### Overall Statistics (Admin only)

| Metric | Source |
|--------|--------|
| Total users (all time) | count users |
| Phone-verified users | count WHERE status != PHONE_VERIFIED |
| Fully registered | count WHERE status = ACTIVE |
| Users in period | count with createdAt filter |
| Friendship points: total awarded / spent | sum from points_transactions |
| No9 orders in period | count no9_orders |
| Park checks in period | count tickets WHERE topic=PARK_CHECK |
| Base checks in period | count tickets WHERE topic=USER_BASE_CHECK |
| Taxi connections in period | count tickets WHERE topic=TAXI_CONNECT |
| Parks verified total | count taxi_parks WHERE status=ACTIVE |
| Average park commission | avg park_classes.parkCommission |
| Average rent price by class | avg park_vehicles.rentPrice grouped by driverClass |
| Users by car class | count users grouped by preferred class |
| Car brands distribution | count from user profiles |

### API Endpoints

```
# Manager statistics (SM + Admin)
GET /api/admin/stats/managers              ← list all managers with summary stats
GET /api/admin/stats/managers/:id          ← detailed stats for one manager
GET /api/admin/stats/managers/:id/details  ← with time filter (from, to, preset)

# Overall statistics (Admin only)
GET /api/admin/stats/overall               ← dashboard with all metrics
GET /api/admin/stats/overall/users         ← user registration stats + chart data
GET /api/admin/stats/overall/points        ← points economy stats
GET /api/admin/stats/overall/orders        ← no9 order stats + chart
GET /api/admin/stats/overall/parks         ← park verification stats + chart
```

## NestJS Modules

### referrals/
```
apps/api/src/modules/referrals/
├── referrals.module.ts
├── referrals.controller.ts        # user: my-link, friends, stats
├── referrals.service.ts           # check + award referral bonuses
```

### stats/
```
apps/api/src/modules/stats/
├── stats.module.ts
├── stats.controller.ts            # manager stats + overall stats
├── manager-stats.service.ts       # per-manager aggregation
└── overall-stats.service.ts       # system-wide aggregation
```
