import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  parkClasses,
  parkVehicles,
  taxiParks,
  ratingWeights,
  ratingConfig,
  classRevenue,
} from "@taxibrat/db";
import { RATING, RatingWeightLevel } from "@taxibrat/shared";
import { RatingService } from "./rating.service";
import type Redis from "ioredis";

// Ordered param names matching RatingService.scoreAllParams output
const PARAM_NAMES = [
  "parkCommission", "withdrawalCommission", "transferCommission",
  "deposit", "depositReturnDays", "latePenalty", "trafficFinePenalty",
  "terminationDays", "contractFairness", "contractMatch", "daysOff",
  "newDriverPromoDays", "replacementCar", "insurance", "inspectionFreq",
  "maintenanceDay", "extraScratch", "repairDowntime", "selfRepair", "repairPricing",
];

@Injectable()
export class RatingRecalculator {
  private readonly logger = new Logger(RatingRecalculator.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    private ratingService: RatingService,
  ) {}

  async getWeightMultipliers(): Promise<number[]> {
    const weights = await this.db.select().from(ratingWeights);
    const weightMap = new Map(weights.map((w) => [w.paramName, w.weight]));

    return PARAM_NAMES.map((name) => {
      const level = weightMap.get(name) ?? "MEDIUM";
      return RATING.WEIGHT_MULTIPLIER[level as keyof typeof RATING.WEIGHT_MULTIPLIER];
    });
  }

  async getConfig() {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    return {
      priceCoeff: config ? parseFloat(String(config.priceCoefficient)) : RATING.DEFAULT_PRICE_COEFF,
      paramsCoeff: config ? parseFloat(String(config.paramsCoefficient)) : RATING.DEFAULT_PARAMS_COEFF,
      yandexCommission: config ? parseFloat(String(config.yandexCommission)) : 0,
      yandexCommissionEconomy: config ? parseFloat(String(config.yandexCommissionEconomy)) : 0,
    };
  }

  async getRevenue(driverClass: string): Promise<number> {
    const [rev] = await this.db
      .select()
      .from(classRevenue)
      .where(eq(classRevenue.driverClass, driverClass as any))
      .limit(1);
    return rev?.dailyRevenue ?? 10000;
  }

  async getBestCostInClass(driverClass: string): Promise<number> {
    // Find minimum total cost across all vehicles of this class
    const allClasses = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.driverClass, driverClass as any));

    const revenue = await this.getRevenue(driverClass);
    const cfg = await this.getConfig();
    let bestCost = Infinity;

    for (const cls of allClasses) {
      const vehicles = await this.db
        .select()
        .from(parkVehicles)
        .where(and(eq(parkVehicles.classId, cls.id), eq(parkVehicles.isAvailable, true)));

      for (const v of vehicles) {
        const cost = this.ratingService.calcTotalCost(
          v.rentPrice,
          parseFloat(String(cls.parkCommission)),
          parseFloat(String(cls.withdrawalCommission)),
          revenue,
          cfg.yandexCommission,
          driverClass,
          cfg.yandexCommissionEconomy,
        );
        if (cost < bestCost) bestCost = cost;
      }
    }

    return bestCost === Infinity ? 0 : bestCost;
  }

  async getClassContext(driverClass: string) {
    const allClasses = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.driverClass, driverClass as any));

    let minDeposit = Infinity;
    let minTermination = Infinity;

    for (const cls of allClasses) {
      if (cls.deposit < minDeposit) minDeposit = cls.deposit;
      if (cls.terminationDays < minTermination) minTermination = cls.terminationDays;
    }

    return {
      minDepositInClass: minDeposit === Infinity ? 0 : minDeposit,
      minTerminationInClass: minTermination === Infinity ? 0 : minTermination,
    };
  }

  async recalcVehicle(vehicleId: string) {
    const [vehicle] = await this.db
      .select()
      .from(parkVehicles)
      .where(eq(parkVehicles.id, vehicleId))
      .limit(1);
    if (!vehicle) return;

    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, vehicle.classId))
      .limit(1);
    if (!cls) return;

    const revenue = await this.getRevenue(cls.driverClass);
    const bestCost = await this.getBestCostInClass(cls.driverClass);
    const config = await this.getConfig();

    const thisCost = this.ratingService.calcTotalCost(
      vehicle.rentPrice,
      parseFloat(String(cls.parkCommission)),
      parseFloat(String(cls.withdrawalCommission)),
      revenue,
      config.yandexCommission,
      cls.driverClass,
      config.yandexCommissionEconomy,
    );

    const priceRating = bestCost > 0
      ? this.ratingService.calcPriceRating(thisCost, bestCost)
      : 0.01;

    const paramsRating = parseFloat(String(cls.paramsRating)) || 0.01;
    const totalRating = this.ratingService.calcTotalRating(
      priceRating,
      paramsRating,
      config.priceCoeff,
      config.paramsCoeff,
    );

    await this.db
      .update(parkVehicles)
      .set({
        priceRating: String(priceRating),
        totalRating: String(totalRating),
      })
      .where(eq(parkVehicles.id, vehicleId));
  }

  async recalcClass(classId: string) {
    const [cls] = await this.db
      .select()
      .from(parkClasses)
      .where(eq(parkClasses.id, classId))
      .limit(1);
    if (!cls) return;

    // Calc params rating
    const weightMultipliers = await this.getWeightMultipliers();
    const context = await this.getClassContext(cls.driverClass);

    const scores = this.ratingService.scoreAllParams(
      {
        transferCommission: parseFloat(String(cls.transferCommission)),
        deposit: cls.deposit,
        depositReturnDays: cls.depositReturnDays,
        latePenalty: cls.latePenalty,
        trafficFinePenalty: cls.trafficFinePenalty,
        terminationDays: cls.terminationDays,
        contractFairness: cls.contractFairness,
        contractMatch: cls.contractMatch,
        daysOff: cls.daysOff,
        newDriverPromoDays: parseFloat(String(cls.newDriverPromoDays)),
        maxPromoDaysInClass: parseFloat(String(cls.maxPromoDaysInClass)),
        replacementCar: cls.replacementCar,
        insurance: cls.insurance,
        inspectionFreq: cls.inspectionFreq,
        maintenanceDay: cls.maintenanceDay,
        extraScratch: cls.extraScratch,
        repairDowntime: cls.repairDowntime,
        selfRepair: cls.selfRepair,
        repairPricing: cls.repairPricing,
      },
      context,
    );

    const paramsRating = this.ratingService.calcParamsRating(scores, weightMultipliers);

    // Update paramsRating first (vehicles need it)
    await this.db
      .update(parkClasses)
      .set({ paramsRating: String(paramsRating) })
      .where(eq(parkClasses.id, classId));

    // Recalc all vehicles in this class
    const vehicles = await this.db
      .select()
      .from(parkVehicles)
      .where(eq(parkVehicles.classId, classId));

    for (const v of vehicles) {
      await this.recalcVehicle(v.id);
    }

    // Reload vehicles to get updated ratings
    const updatedVehicles = await this.db
      .select()
      .from(parkVehicles)
      .where(and(eq(parkVehicles.classId, classId), eq(parkVehicles.isAvailable, true)));

    const hasAvailable = updatedVehicles.length > 0;
    const classRating = hasAvailable
      ? updatedVehicles.reduce((sum, v) => sum + parseFloat(String(v.totalRating)), 0) / updatedVehicles.length
      : 0;

    await this.db
      .update(parkClasses)
      .set({
        rating: String(this.ratingService.clamp(classRating)),
        hasAvailableCars: hasAvailable,
      })
      .where(eq(parkClasses.id, classId));
  }

  async recalcPark(parkId: string) {
    const classes = await this.db
      .select()
      .from(parkClasses)
      .where(and(eq(parkClasses.parkId, parkId), eq(parkClasses.hasAvailableCars, true)));

    const parkRating = classes.length > 0
      ? classes.reduce((sum, c) => sum + parseFloat(String(c.rating)), 0) / classes.length
      : 0;

    await this.db
      .update(taxiParks)
      .set({ rating: String(this.ratingService.clamp(parkRating)) })
      .where(eq(taxiParks.id, parkId));

    await this.updateAvgRating();
  }

  async recalcAll() {
    this.logger.log("Full recalculation started...");
    const allClasses = await this.db.select().from(parkClasses);

    for (const cls of allClasses) {
      await this.recalcClass(cls.id);
    }

    const parkIds = [...new Set(allClasses.map((c) => c.parkId))];
    for (const parkId of parkIds) {
      await this.recalcPark(parkId);
    }

    this.logger.log(`Full recalculation complete: ${allClasses.length} classes, ${parkIds.length} parks`);
  }

  async updateAvgRating() {
    const result = await this.db
      .select({ avg: sql<number>`avg(${parkClasses.rating}::numeric)` })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(and(eq(taxiParks.status, "ACTIVE"), eq(parkClasses.hasAvailableCars, true)));

    const avg = result[0]?.avg ?? 0;
    await this.redis.set("avg_class_rating", String(avg));
  }

  async getAvgRating(): Promise<number> {
    const cached = await this.redis.get("avg_class_rating");
    return cached ? parseFloat(cached) : 2.5;
  }
}
