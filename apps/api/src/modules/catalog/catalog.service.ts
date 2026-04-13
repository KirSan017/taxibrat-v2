import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  parkClasses,
  taxiParks,
  parkVehicles,
  carBrands,
  carModels,
} from "@taxibrat/db";
import { CatalogQueryDto } from "@taxibrat/shared";

@Injectable()
export class CatalogService {
  constructor(@Inject("DATABASE") private db: Database) {}

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
    // Super advertised always at position 2
    const superAd = classes.filter((c: any) => c.isSuperAdvertised);
    const ads = classes.filter((c: any) => c.isAdvertised && !c.isSuperAdvertised);
    const regular = classes.filter((c: any) => !c.isAdvertised && !c.isSuperAdvertised);

    // Shuffle non-advertised (per TZ: random order for non-promoted)
    for (let i = regular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regular[i], regular[j]] = [regular[j], regular[i]];
    }

    // Combine: ads sorted by rating, then regular random
    const combined = [...ads, ...regular];

    // Insert super-ad at position 2 (index 1)
    if (superAd.length > 0) {
      combined.splice(1, 0, ...superAd);
    }

    return combined;
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

    return { ...cls, park, vehicles };
  }
}
