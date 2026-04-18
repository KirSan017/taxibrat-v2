import { Injectable } from "@nestjs/common";
import { RATING } from "@taxibrat/shared";

// TODO: Brand/Model ratings (ТЗ) — currently computed on-the-fly in
// CatalogService.resortByVehicleRating. Sufficient for MVP; persistent
// aggregate tables can be added later if needed for analytics.

@Injectable()
export class RatingService {
  clamp(value: number): number {
    return Math.max(RATING.MIN, Math.min(RATING.MAX, Math.round(value * 100) / 100));
  }

  scoreTransferCommission(percent: number): number {
    return this.clamp(5.0 - percent * 1.5);
  }

  scoreDeposit(deposit: number, minInClass: number): number {
    const diff = deposit - minInClass;
    return this.clamp(5.0 - (diff / 1000) * 0.1);
  }

  scoreDepositReturnDays(days: number): number {
    return this.clamp(5.0 - days * 0.15);
  }

  scoreLatePenalty(rubles: number): number {
    return this.clamp(5.0 - (rubles / 100) * 0.1);
  }

  scoreTrafficFinePenalty(rubles: number): number {
    return this.clamp(5.0 - (rubles / 10) * 0.2);
  }

  scoreTerminationDays(days: number, minInClass: number): number {
    const diff = days - minInClass;
    return this.clamp(5.0 - diff * 0.2);
  }

  scoreDirectMapping(value: number): number {
    return this.clamp(value);
  }

  scoreNewDriverPromo(freeDays: number, maxFreeDaysInClass: number): number {
    if (maxFreeDaysInClass <= 0) return this.clamp(0);
    return this.clamp(5.0 * (freeDays / maxFreeDaysInClass));
  }

  scoreSelfRepair(value: number): number {
    const map: Record<number, number> = { 1: 1.0, 2: 3.0, 3: 5.0 };
    return this.clamp(map[value] ?? 3.0);
  }

  scoreRepairPricing(value: number): number {
    const map: Record<number, number> = { 1: 1.0, 2: 3.0, 3: 5.0 };
    return this.clamp(map[value] ?? 3.0);
  }

  calcPriceRating(thisCost: number, bestCost: number): number {
    if (thisCost <= 0) return this.clamp(0);
    return this.clamp(5.0 * (bestCost / thisCost));
  }

  calcTotalCost(
    rentPrice: number,
    parkCommission: number,
    withdrawalCommission: number,
    dailyRevenue: number,
    yandexCommission: number = 0,
    driverClass: string = "",
    yandexCommissionEconomy: number = 0,
  ): number {
    // Yandex commission on revenue (ТЗ 597-600)
    const yandexRate =
      driverClass === "ECONOMY" && yandexCommissionEconomy > 0
        ? yandexCommissionEconomy
        : yandexCommission;
    const yandexComm = dailyRevenue * (yandexRate / 100);
    const afterYandex = dailyRevenue - yandexComm;

    // Park commission on post-Yandex revenue
    const parkComm = afterYandex * (parkCommission / 100);
    const netAfterParkComm = afterYandex - afterYandex * 0.25 - parkComm;
    const withdrawalComm = netAfterParkComm * (withdrawalCommission / 100);
    return rentPrice + parkComm + withdrawalComm + yandexComm;
  }

  calcParamsRating(scores: number[], weightMultipliers: number[]): number {
    let totalWeighted = 0;
    let totalWeight = 0;
    for (let i = 0; i < scores.length; i++) {
      totalWeighted += scores[i] * weightMultipliers[i];
      totalWeight += weightMultipliers[i];
    }
    if (totalWeight === 0) return this.clamp(0);
    return this.clamp(totalWeighted / totalWeight);
  }

  calcTotalRating(priceRating: number, paramsRating: number, priceCoeff: number, paramsCoeff: number): number {
    return this.clamp(priceRating * priceCoeff + paramsRating * paramsCoeff);
  }

  scoreAllParams(params: {
    transferCommission: number;
    deposit: number;
    depositReturnDays: number;
    latePenalty: number;
    trafficFinePenalty: number;
    terminationDays: number;
    contractFairness: number;
    contractMatch: number;
    daysOff: number;
    newDriverPromoDays: number;
    maxPromoDaysInClass: number;
    replacementCar: number;
    insurance: number;
    inspectionFreq: number;
    maintenanceDay: number;
    extraScratch: number;
    repairDowntime: number;
    selfRepair: number;
    repairPricing: number;
  }, context: { minDepositInClass: number; minTerminationInClass: number }): number[] {
    return [
      3.0, // parkCommission — accounted in price rating
      3.0, // withdrawalCommission — accounted in price rating
      this.scoreTransferCommission(params.transferCommission),
      this.scoreDeposit(params.deposit, context.minDepositInClass),
      this.scoreDepositReturnDays(params.depositReturnDays),
      this.scoreLatePenalty(params.latePenalty),
      this.scoreTrafficFinePenalty(params.trafficFinePenalty),
      this.scoreTerminationDays(params.terminationDays, context.minTerminationInClass),
      this.scoreDirectMapping(params.contractFairness),
      this.scoreDirectMapping(params.contractMatch),
      this.scoreDirectMapping(params.daysOff),
      this.scoreNewDriverPromo(params.newDriverPromoDays, params.maxPromoDaysInClass),
      this.scoreDirectMapping(params.replacementCar),
      this.scoreDirectMapping(params.insurance),
      this.scoreDirectMapping(params.inspectionFreq),
      this.scoreDirectMapping(params.maintenanceDay),
      this.scoreDirectMapping(params.extraScratch),
      this.scoreDirectMapping(params.repairDowntime),
      this.scoreSelfRepair(params.selfRepair),
      this.scoreRepairPricing(params.repairPricing),
    ];
  }
}
