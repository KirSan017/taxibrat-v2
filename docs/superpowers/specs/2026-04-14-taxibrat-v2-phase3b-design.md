# TaxiBrat v2 — Phase 3b: Car Buyout Listings

> Spec date: 2026-04-14
> Depends on: Phase 2a (car_brands, car_models), Phase 2b (tickets for booking)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Car buyout marketplace: users and managers create listings, SM reviews and fills owner details, users can book cars (creates BUYOUT ticket to SM). Deduplication by last 7 VIN digits.

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Photos | URL array in `text[]` column | MVP simplicity, upload endpoint later |
| Deduplication | Unique constraint on `vin7` | Per ТЗ, last 7 VIN chars |
| Booking | Creates ticket (topic BUYOUT) | Reuses existing ticket system |
| Owner fields | Visible only to SM/Admin | Per ТЗ, managers don't see owner details |

## Database Schema

### buyout_listings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| brandId | uuid | FK → car_brands |
| modelId | uuid | FK → car_models |
| year | int | |
| title | varchar(300) | Auto-generated: "Kia Rio 2022" |
| price | int | Total buyout price in rubles |
| mileage | int | nullable, km |
| vin7 | varchar(7) | UNIQUE, last 7 VIN chars |
| description | text | nullable |
| photos | text[] | Array of URLs |
| ownerType | enum | INDIVIDUAL, LEGAL_ENTITY, TAXI_PARK, BANK |
| ownerName | varchar(200) | nullable, SM-only |
| ownerContact | varchar(200) | nullable, SM-only |
| ownerAddress | varchar(500) | nullable, SM-only |
| ownerPhone | varchar(20) | nullable, SM-only |
| isAdvertised | boolean | default false, admin-only |
| status | enum | DRAFT, PENDING_REVIEW, ACTIVE, ARCHIVED |
| createdById | uuid | FK → users |
| reviewedById | uuid | FK → users, nullable |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

## Visibility Rules

| Field | User | Manager | SM | Admin |
|-------|:----:|:-------:|:--:|:-----:|
| Listing details | ACTIVE only | all | all | all |
| ownerType | yes | yes | yes | yes |
| ownerName/Contact/Address/Phone | no | no | yes | yes |
| isAdvertised toggle | no | no | no | yes |
| Archive/Restore | no | no | yes | yes |

## Sorting

1. Advertised listings first, sorted by price ASC
2. Regular listings, sorted by price ASC

## Similar cars slider: 8 listings from same ownerType category, advertised first, then by price DESC.

## API Endpoints

### Public
- `GET /api/buyout` — ACTIVE listings with filters (brandId, modelId, year, ownerType, priceFrom, priceTo, page, limit)
- `GET /api/buyout/:id` — detail (owner fields hidden)

### User (authenticated)
- `POST /api/buyout` — create listing → status DRAFT
- `POST /api/buyout/:id/book` — "Забронировать" → creates BUYOUT ticket to SM

### Manager
- `GET /api/admin/buyout` — all listings (all statuses)
- `POST /api/admin/buyout` — create listing
- `PATCH /api/admin/buyout/:id` — update (not owner fields)
- `POST /api/admin/buyout/:id/submit` — send for SM review → PENDING_REVIEW

### SM + Admin
- `POST /api/admin/buyout/:id/approve` — approve + fill owner fields → ACTIVE
- `POST /api/admin/buyout/:id/reject` — reject with reason → DRAFT
- `POST /api/admin/buyout/:id/archive` — → ARCHIVED
- `POST /api/admin/buyout/:id/restore` — → ACTIVE

## NestJS Module

```
apps/api/src/modules/buyout/
├── buyout.module.ts
├── buyout.controller.ts          # public + user endpoints
├── buyout.admin.controller.ts    # manager + SM + admin
└── buyout.service.ts             # CRUD, filters, booking → ticket
```

### Dependencies
- `buyout` → `auth` (DATABASE, REDIS)
- `buyout` → `tickets` (create BUYOUT ticket on booking)
- Uses `car_brands`, `car_models` from Phase 2a schema
