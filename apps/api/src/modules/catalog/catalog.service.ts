import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, inArray, lt, or } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  parkClasses,
  taxiParks,
  parkVehicles,
  carBrands,
  carModels,
  users,
} from "@taxibrat/db";
import { CatalogQueryDto } from "@taxibrat/shared";
import { RatingRecalculator } from "../rating/rating.recalculator";

@Injectable()
export class CatalogService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  async listHomepageSlider(limit = 8) {
    const avgRating = await this.recalculator.getAvgRating();

    // Grab a wide window: advertised parks OR low-rating parks with available cars
    const rows = await this.db
      .select({
        id: parkClasses.id,
        parkId: taxiParks.id,
        parkName: taxiParks.name,
        parkAddress: taxiParks.address,
        parkPhone: taxiParks.phone,
        parkDistrict: taxiParks.district,
        isAdvertised: taxiParks.isAdvertised,
        isSuperAdvertised: taxiParks.isSuperAdvertised,
        driverClass: parkClasses.driverClass,
        rating: parkClasses.rating,
        paramsRating: parkClasses.paramsRating,
        deposit: parkClasses.deposit,
        parkCommission: parkClasses.parkCommission,
        hasAvailableCars: parkClasses.hasAvailableCars,
      })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(
        and(
          eq(taxiParks.status, "ACTIVE"),
          eq(parkClasses.hasAvailableCars, true),
          or(
            eq(taxiParks.isAdvertised, true),
            eq(taxiParks.isSuperAdvertised, true),
            lt(parkClasses.rating, String(avgRating)),
          ),
        ),
      )
      .limit(50);

    // Deduplicate by parkId (first-wins)
    const seen = new Set<string>();
    const unique: typeof rows = [];
    for (const r of rows) {
      if (seen.has(r.parkId)) continue;
      seen.add(r.parkId);
      unique.push(r);
    }

    const advertised = unique
      .filter((r) => r.isAdvertised || r.isSuperAdvertised)
      .sort((a, b) => parseFloat(String(b.rating)) - parseFloat(String(a.rating)));

    const regular = unique.filter((r) => !r.isAdvertised && !r.isSuperAdvertised);
    for (let i = regular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regular[i], regular[j]] = [regular[j], regular[i]];
    }

    return [...advertised, ...regular].slice(0, limit);
  }

  async listClasses(dto: CatalogQueryDto) {
    const conditions = [
      eq(taxiParks.status, "ACTIVE"),
      eq(parkClasses.hasAvailableCars, true),
    ];

    if (dto.driverClass) {
      conditions.push(eq(parkClasses.driverClass, dto.driverClass as any));
    }

    // District filter
    if (dto.district && dto.district.length > 0) {
      conditions.push(inArray(taxiParks.district, dto.district as any));
    }

    // Default sort: by rating DESC
    // More complex sorting (by brand/model/year vehicle ratings) is done post-query
    const results = await this.db
      .select({
        id: parkClasses.id,
        parkId: taxiParks.id,
        parkName: taxiParks.name,
        parkAddress: taxiParks.address,
        parkPhone: taxiParks.phone,
        parkDistrict: taxiParks.district,
        isAdvertised: taxiParks.isAdvertised,
        isSuperAdvertised: taxiParks.isSuperAdvertised,
        driverClass: parkClasses.driverClass,
        rating: parkClasses.rating,
        paramsRating: parkClasses.paramsRating,
        deposit: parkClasses.deposit,
        parkCommission: parkClasses.parkCommission,
        hasAvailableCars: parkClasses.hasAvailableCars,
      })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(and(...conditions))
      .orderBy(desc(parkClasses.rating))
      .limit(dto.limit + 50) // fetch extra for re-sorting
      .offset((dto.page - 1) * dto.limit);

    // If brand/model/year filters, re-sort by vehicle-level ratings
    let sorted = results;
    if (dto.brandId || dto.modelId || dto.year) {
      sorted = await this.resortByVehicleRating(results, dto);
    }

    // Apply positioning rules
    return this.applyPositioning(sorted.slice(0, dto.limit));
  }

  private async resortByVehicleRating(
    classes: typeof parkClasses.$inferSelect extends never ? any[] : any[],
    dto: CatalogQueryDto,
  ) {
    const classIds = classes.map((c: any) => c.id);
    if (classIds.length === 0) return classes;

    // Get matching vehicles for these classes
    const vehicleConditions = [inArray(parkVehicles.classId, classIds)];
    if (dto.brandId) vehicleConditions.push(eq(parkVehicles.brandId, dto.brandId));
    if (dto.modelId) vehicleConditions.push(eq(parkVehicles.modelId, dto.modelId));
    if (dto.year) vehicleConditions.push(eq(parkVehicles.year, dto.year));

    const vehicles = await this.db
      .select({
        classId: parkVehicles.classId,
        totalRating: parkVehicles.totalRating,
      })
      .from(parkVehicles)
      .where(and(...vehicleConditions, eq(parkVehicles.isAvailable, true)));

    // Compute avg vehicle rating per class
    const avgByClass = new Map<string, number>();
    const countByClass = new Map<string, number>();
    for (const v of vehicles) {
      const current = avgByClass.get(v.classId) ?? 0;
      const count = countByClass.get(v.classId) ?? 0;
      avgByClass.set(v.classId, current + parseFloat(String(v.totalRating)));
      countByClass.set(v.classId, count + 1);
    }

    // Sort classes by their matching vehicle avg rating
    return classes.sort((a: any, b: any) => {
      const aAvg = (avgByClass.get(a.id) ?? 0) / (countByClass.get(a.id) ?? 1);
      const bAvg = (avgByClass.get(b.id) ?? 0) / (countByClass.get(b.id) ?? 1);
      return bAvg - aAvg;
    });
  }

  private applyPositioning(classes: any[]) {
    // Per ТЗ: super-advertised park always at position 2 (index 1).
    // All non-super-advertised parks (including regular advertised) appear
    // in random order — advertising lifts a park into the visible window via
    // the filter rules above, but does NOT determine final order on the page.
    const superAd = classes.filter((c: any) => c.isSuperAdvertised);
    const others = classes.filter((c: any) => !c.isSuperAdvertised);

    // Shuffle ALL non-super
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    if (superAd.length > 0) {
      others.splice(1, 0, ...superAd);
    }

    return others;
  }

  async getClassDetail(classId: string) {
    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, classId))
      .limit(1);
    if (!cls) return null;

    const [park] = await this.db
      .select()
      .from(taxiParks)
      .where(eq(taxiParks.id, cls.parkId))
      .limit(1);

    // Resolve last updater display name (ТАКСИБРАТ when no user)
    let lastUpdatedByName = "ТАКСИБРАТ";
    if (cls.lastUpdatedBy) {
      const [updater] = await this.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, cls.lastUpdatedBy))
        .limit(1);
      if (updater) {
        const first = updater.firstName ?? "";
        const last = updater.lastName ?? "";
        if (first || last) {
          lastUpdatedByName = last
            ? `${first} ${last.charAt(0)}.`.trim()
            : first;
        }
      }
    }

    const vehicles = await this.db
      .select({
        id: parkVehicles.id,
        brandName: carBrands.name,
        modelName: carModels.name,
        year: parkVehicles.year,
        rentPrice: parkVehicles.rentPrice,
        isAvailable: parkVehicles.isAvailable,
        priceRating: parkVehicles.priceRating,
        totalRating: parkVehicles.totalRating,
      })
      .from(parkVehicles)
      .innerJoin(carBrands, eq(parkVehicles.brandId, carBrands.id))
      .innerJoin(carModels, eq(parkVehicles.modelId, carModels.id))
      .where(eq(parkVehicles.classId, classId))
      .orderBy(desc(parkVehicles.totalRating));

    return { ...cls, park, vehicles, lastUpdatedByName };
  }
}
