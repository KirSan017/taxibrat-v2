# TaxiBrat v2 — Phase 2a: Taxi Parks + Rating System

> Spec date: 2026-04-13
> Depends on: Phase 1 (auth, users, roles, notifications, audit)
> Source: ТЗ Таксибрат - Киберия.docx

## Overview

Taxi parks catalog with hierarchical data model (park → class → vehicle), a 20-parameter rating engine with cached scores, complex visibility rules (hide good parks to monetize), and multi-criteria filtering/sorting.

Phase 2b (tickets + chat) is a separate spec.

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Data model | 3 tables: taxi_parks → park_classes → park_vehicles | Reflects ТЗ hierarchy, enables per-vehicle filtering |
| 20 parameters | Columns in park_classes (not key-value) | Fixed set, simpler queries, type-safe |
| Rating calculation | On-save (cached) | Reads 100x more frequent than writes |
| Visibility | Backend-only field masking | Security — hidden data never sent to client |
| Car brands | Local tables + DaData fallback | Fast, autonomous, cached as per ТЗ |
| Full recalculation | On weight/revenue change, via queue | Avoid blocking API on mass recalc |

## Database Schema

### car_brands
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(100) | UNIQUE, e.g. "Kia", "Toyota" |
| createdAt | timestamptz | |

### car_models
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| brandId | uuid | FK → car_brands |
| name | varchar(100) | e.g. "Rio", "Camry" |
| unique(brandId, name) | | |
| createdAt | timestamptz | |

### taxi_parks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(200) | |
| address | varchar(500) | |
| phone | varchar(20) | |
| city | varchar(50) | default "moscow" |
| district | enum | CAO, SVAO, SAO, SZAO, ZAO, UZAO, UAO, UVAO, VAO, MYTISCHI, KRASNOGORSK, DOLGOPRUDNY, KHIMKI, ODINTSOVO, NOVOMOSKOVSKY, BUTOVO, VIDNOE, LUBERTSY, REUTOV, BALASHIKHA |
| isAdvertised | boolean | default false, paid card |
| isSuperAdvertised | boolean | default false, main paid card (always 2nd position) |
| rating | decimal(3,2) | cached: average of all class ratings (admin-only visibility) |
| sources | text[] | source URLs |
| createdById | uuid | FK → users |
| status | enum | DRAFT, ACTIVE, ARCHIVED |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### park_classes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| parkId | uuid | FK → taxi_parks |
| driverClass | enum | ECONOMY, COMFORT, COMFORT_PLUS, BUSINESS, PREMIER, ELITE |
| unique(parkId, driverClass) | | |
| **20 Parameters** | | |
| parkCommission | decimal(5,2) | 1. Park commission % |
| withdrawalCommission | decimal(5,2) | 2. Withdrawal commission % |
| transferCommission | decimal(5,2) | 3. Rent transfer commission % |
| deposit | int | 4. Deposit in rubles |
| depositReturnDays | int | 5. Deposit return days |
| latePenalty | int | 6. Late payment penalty rubles |
| trafficFinePenalty | int | 7. Traffic fine commission rubles |
| terminationDays | int | 8. Lease termination days |
| contractFairness | int | 9. Contract fairness (1-5) |
| contractMatch | int | 10. Contract vs reality match (1-5) |
| daysOff | int | 11. Days off per year (1-5) |
| newDriverPromoDays | decimal(5,1) | 12. New driver promo: calculated free days |
| maxPromoDaysInClass | decimal(5,1) | 12. Max free days in this class (for formula) |
| replacementCar | int | 13. Replacement car (1-5) |
| insurance | int | 14. Insurance (1-5) |
| inspectionFreq | int | 15. Inspection frequency (1-5) |
| maintenanceDay | int | 16. Maintenance day (1-5) |
| extraScratch | int | 17. Extra scratch penalty (1-5) |
| repairDowntime | int | 18. Repair downtime (1-6) |
| selfRepair | int | 19. Self repair allowed (1-3) |
| repairPricing | int | 20. Repair pricing fairness (1-3) |
| **Cached ratings** | | |
| paramsRating | decimal(3,2) | Weighted average of 20 params (0.01-5.00) |
| rating | decimal(3,2) | Final class rating: average of all vehicle totalRatings |
| hasAvailableCars | boolean | false → grey card, excluded from park rating |
| lastUpdatedBy | uuid | FK → users, shows "Имя Ф." or "ТАКСИБРАТ" |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### park_vehicles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| classId | uuid | FK → park_classes |
| brandId | uuid | FK → car_brands |
| modelId | uuid | FK → car_models |
| year | int | |
| rentPrice | int | Daily rent price in rubles |
| isAvailable | boolean | default true |
| priceRating | decimal(3,2) | Cached: price rating with commissions |
| totalRating | decimal(3,2) | Cached: price×0.6 + params×0.4 |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### rating_weights
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| paramName | varchar(50) | UNIQUE, e.g. "parkCommission", "deposit" |
| weight | enum | LOW, MEDIUM, HIGH |
| updatedAt | timestamptz | |

### rating_config
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, singleton row |
| priceCoefficient | decimal(3,2) | default 0.60 (price weight in final rating) |
| paramsCoefficient | decimal(3,2) | default 0.40 (params weight in final rating) |
| updatedAt | timestamptz | |

### class_revenue
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| driverClass | enum | UNIQUE |
| dailyRevenue | int | Average daily revenue, set by admin |
| updatedAt | timestamptz | |

**Seed data for class_revenue:**
- ECONOMY: 10000
- COMFORT: 11000
- COMFORT_PLUS: 12500
- BUSINESS: 16000
- PREMIER: 20000
- ELITE: 25000

**Seed data for rating_weights (20 params):**
All params seeded with weights from ТЗ:
- HIGH: deposit, newDriverPromoDays, insurance, extraScratch, repairDowntime
- MEDIUM: all others

## Rating Engine

### Vehicle Price Rating
```
dailyRevenue = class_revenue[driverClass].dailyRevenue
parkComm = dailyRevenue × (parkCommission / 100)
netAfterParkComm = dailyRevenue - (dailyRevenue × 0.25) - parkComm
withdrawalComm = netAfterParkComm × (withdrawalCommission / 100)
totalCost = rentPrice + parkComm + withdrawalComm

bestCost = MIN(totalCost) across ALL vehicles of same driverClass in ALL active parks
priceRating = clamp(5 × (bestCost / totalCost), 0.01, 5.00)
```

### Parameter Scoring (examples from ТЗ)
```
transferCommission: 0% = 5.00, each +0.1% = -0.15, min 0.01
deposit: min in class = 5.00, each +1000₽ = -0.10, min 0.01
depositReturnDays: 0 days = 5.00, each +1 day = -0.15
latePenalty: 0₽ = 5.00, each +100₽ = -0.10, min 0.01
trafficFinePenalty: 0₽ = 5.00, each +10₽ = -0.20, min 0.01
terminationDays: min = 5.00, each +1 day = -0.20
contractFairness: direct mapping (1→1, 2→2, ..., 5→5)
contractMatch: direct mapping
daysOff: direct mapping
newDriverPromoDays: 5 × (thisDays / maxDaysInClass), min 0.01
replacementCar: direct mapping
insurance: direct mapping
inspectionFreq: direct mapping
maintenanceDay: direct mapping
extraScratch: direct mapping
repairDowntime: direct mapping (1-6 → map to 1-5 scale)
selfRepair: 1→1, 2→3, 3→5
repairPricing: 1→1, 2→3, 3→5
```

### Params Rating (per class)
```
weightMultiplier = { LOW: 1, MEDIUM: 2, HIGH: 3 }
For each param: score × weightMultiplier[weight]
paramsRating = sum(weighted scores) / sum(weightMultipliers)
Clamped to [0.01, 5.00]
```

### Vehicle Total Rating
```
totalRating = priceRating × priceCoefficient + paramsRating × paramsCoefficient
Clamped to [0.01, 5.00]
```

### Class Rating
```
availableVehicles = vehicles WHERE isAvailable = true
rating = AVG(availableVehicles.totalRating)
hasAvailableCars = availableVehicles.length > 0
```

### Park Rating
```
activeClasses = classes WHERE hasAvailableCars = true
rating = AVG(activeClasses.rating)
```

### System Average Rating (for visibility)
```
avgRating = AVG(park_classes.rating) WHERE park.status = ACTIVE AND hasAvailableCars = true
Cached in Redis key "avg_class_rating", TTL = none (invalidated on recalc)
```

### Recalculation Triggers
| Event | Recalculates |
|-------|-------------|
| Vehicle created/updated/deleted | This vehicle → its class → its park |
| Class params updated | This class's paramsRating → all its vehicles → class rating → park |
| Weight changed (admin) | ALL classes → ALL vehicles → ALL parks (queued) |
| Revenue changed (admin) | ALL vehicles in that class → their classes → parks (queued) |

## Visibility Rules

Applied server-side in VisibilityService. API never returns hidden fields.

### Field Masking Matrix
| Field | Anonymous | Phone-verified | High rating | Advertised |
|-------|:---------:|:--------------:|:-----------:|:----------:|
| Park name | lock icon | YES | HIDDEN | YES |
| Address | HIDDEN | YES | HIDDEN | YES |
| Phone | HIDDEN | HIDDEN | HIDDEN | YES (auth only) |
| Class rating | YES | YES | YES | YES |
| Key conditions (price, deposit) | YES | YES | YES | YES |
| Detailed params | BLUR | YES | YES | YES |
| "Rent" button | → register | → creates ticket | → creates ticket | → creates ticket |

### Visibility Logic
```
isHighRating = parkClass.rating > avgSystemRating
isAdvertised = park.isAdvertised || park.isSuperAdvertised

if (!user) → anonymous view (minimal fields)
if (user && !isHighRating) → full view except phone
if (user && isHighRating && !isAdvertised) → hidden name/address/phone
if (user && isAdvertised) → full view including phone
```

Response format for hidden fields:
```json
{ "name": null, "nameHidden": true, "address": null, "addressHidden": true }
```

## Catalog Sorting

### Sort Priority
1. `isSuperAdvertised = true` → ALWAYS position 2
2. `isAdvertised = true` → sorted by rating DESC among themselves
3. Non-advertised with rating < average → **random order** (re-shuffled per request)
4. Non-advertised with rating >= average → sorted by relevant rating DESC

### Sort Criteria by Filter
| Active filters | Sort by |
|---------------|---------|
| Class only | park_classes.rating DESC |
| Class + brand | AVG(totalRating) of vehicles matching brand in that class DESC |
| Class + brand + model | AVG(totalRating) of vehicles matching model DESC |
| Class + brand + model + year | totalRating of exact vehicle match DESC |
| Equal ratings | Fall back to parent level (model→brand→class) |

## API Endpoints

### Public Catalog
- `GET /api/catalog/classes` — paginated list with filters (driverClass, brandId, modelId, year, district[], page, limit)
- `GET /api/catalog/classes/:id` — detail page with vehicles and params
- `GET /api/catalog/brands` — all brands for filter dropdown
- `GET /api/catalog/models?brandId=` — models for selected brand

### Admin: Parks
- `POST /api/admin/parks` — create park (name, address, phone, district)
- `GET /api/admin/parks` — list all parks with ratings (admin sees all)
- `GET /api/admin/parks/:id` — park detail with all classes
- `PATCH /api/admin/parks/:id` — update park info
- `DELETE /api/admin/parks/:id` — delete park (admin only)

### Admin: Classes
- `POST /api/admin/parks/:parkId/classes` — add class with 20 params
- `GET /api/admin/parks/:parkId/classes` — list classes of a park
- `PATCH /api/admin/parks/:parkId/classes/:id` — update class (triggers recalc)
- `POST /api/admin/parks/:parkId/classes/:id/copy` — copy class to new driverClass

### Admin: Vehicles
- `POST /api/admin/classes/:classId/vehicles` — add vehicle (triggers recalc)
- `PATCH /api/admin/classes/:classId/vehicles/:id` — update vehicle (triggers recalc)
- `DELETE /api/admin/classes/:classId/vehicles/:id` — delete vehicle (triggers recalc)

### Admin: Brands
- `POST /api/admin/brands` — create brand
- `POST /api/admin/models` — create model
- `GET /api/admin/brands/search?q=` — autocomplete (local + DaData fallback)

### Admin: Rating Config
- `GET /api/admin/rating/weights` — current weights
- `PATCH /api/admin/rating/weights` — update weights (admin only, triggers full recalc)
- `GET /api/admin/rating/config` — price/params coefficients
- `PATCH /api/admin/rating/config` — update coefficients (admin only, triggers full recalc)
- `GET /api/admin/rating/revenue` — daily revenue per class
- `PATCH /api/admin/rating/revenue` — update revenue (admin only, triggers class recalc)
- `POST /api/admin/rating/recalculate` — force full recalculation (admin only)

## NestJS Modules

### catalog/
- `CatalogController` — public endpoints with filtering/sorting
- `CatalogService` — query builder with dynamic sort criteria
- `VisibilityService` — field masking based on user role + rating

### parks/
- `ParksController` — CRUD taxi parks
- `ParksService` — park management
- `ClassesController` — CRUD park classes
- `ClassesService` — class management, triggers rating recalc
- `VehiclesController` — CRUD park vehicles
- `VehiclesService` — vehicle management, triggers rating recalc

### rating/
- `RatingService` — pure functions: paramToScore(), calcPriceRating(), calcParamsRating(), calcTotalRating()
- `RatingRecalculator` — orchestrator: recalcVehicle(), recalcClass(), recalcPark(), recalcAll()
- `RatingAdminController` — weights, config, revenue, force recalc
- Fully unit-tested (all 20 param formulas + price formula)

### brands/
- `BrandsController` — CRUD + autocomplete
- `BrandsService` — local lookup + DaData fallback
- `DaDataProvider` — external API integration for car brands/models

## What Phase 2a Does NOT Include
- User-submitted park additions (ticket flow → Phase 2b)
- "Incorrect info" reports (ticket flow → Phase 2b)
- "Rent this car" button action (ticket flow → Phase 2b)
- Honor board (depends on tickets → Phase 2b)
- Duplicate detection for parks (phone/name/address) → Phase 2b with ticket flow
- Buyout cars section → Phase 3
- DaData address autocomplete → Phase 2b (park creation by user)
