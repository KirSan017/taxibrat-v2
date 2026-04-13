import { RatingService } from "./rating.service";

describe("RatingService", () => {
  let service: RatingService;

  beforeEach(() => {
    service = new RatingService();
  });

  describe("clamp", () => {
    it("clamps below min", () => expect(service.clamp(-1)).toBe(0.01));
    it("clamps above max", () => expect(service.clamp(10)).toBe(5.0));
    it("passes valid", () => expect(service.clamp(3.5)).toBe(3.5));
  });

  describe("scoreTransferCommission", () => {
    it("0% = 5.00", () => expect(service.scoreTransferCommission(0)).toBe(5.0));
    it("1% = 3.50", () => expect(service.scoreTransferCommission(1)).toBe(3.5));
    it("10% = 0.01", () => expect(service.scoreTransferCommission(10)).toBe(0.01));
  });

  describe("scoreDeposit", () => {
    it("min = 5.00", () => expect(service.scoreDeposit(5000, 5000)).toBe(5.0));
    it("30000 min 5000 = 2.50", () => expect(service.scoreDeposit(30000, 5000)).toBe(2.5));
  });

  describe("scoreDepositReturnDays", () => {
    it("0 days = 5.00", () => expect(service.scoreDepositReturnDays(0)).toBe(5.0));
    it("10 days = 3.50", () => expect(service.scoreDepositReturnDays(10)).toBe(3.5));
  });

  describe("scoreLatePenalty", () => {
    it("0 = 5.00", () => expect(service.scoreLatePenalty(0)).toBe(5.0));
    it("2500 = 2.50", () => expect(service.scoreLatePenalty(2500)).toBe(2.5));
  });

  describe("scoreTrafficFinePenalty", () => {
    it("0 = 5.00", () => expect(service.scoreTrafficFinePenalty(0)).toBe(5.0));
    it("100 = 3.00", () => expect(service.scoreTrafficFinePenalty(100)).toBe(3.0));
  });

  describe("scoreTerminationDays", () => {
    it("min = 5.00", () => expect(service.scoreTerminationDays(1, 1)).toBe(5.0));
    it("10 min 1 = 3.20", () => expect(service.scoreTerminationDays(10, 1)).toBe(3.2));
  });

  describe("scoreDirectMapping", () => {
    it("maps 1-5", () => {
      expect(service.scoreDirectMapping(5)).toBe(5.0);
      expect(service.scoreDirectMapping(1)).toBe(1.0);
    });
  });

  describe("scoreNewDriverPromo", () => {
    it("max = 5.00", () => expect(service.scoreNewDriverPromo(6, 6)).toBe(5.0));
    it("0 = 0.01", () => expect(service.scoreNewDriverPromo(0, 6)).toBe(0.01));
    it("half = 2.50", () => expect(service.scoreNewDriverPromo(3, 6)).toBe(2.5));
  });

  describe("scoreSelfRepair", () => {
    it("1→1, 2→3, 3→5", () => {
      expect(service.scoreSelfRepair(1)).toBe(1.0);
      expect(service.scoreSelfRepair(2)).toBe(3.0);
      expect(service.scoreSelfRepair(3)).toBe(5.0);
    });
  });

  describe("scoreRepairPricing", () => {
    it("1→1, 2→3, 3→5", () => {
      expect(service.scoreRepairPricing(1)).toBe(1.0);
      expect(service.scoreRepairPricing(2)).toBe(3.0);
      expect(service.scoreRepairPricing(3)).toBe(5.0);
    });
  });

  describe("calcPriceRating", () => {
    it("best = 5.00", () => expect(service.calcPriceRating(2810, 2810)).toBe(5.0));
    it("higher cost = lower", () => expect(service.calcPriceRating(3388, 2810)).toBeCloseTo(4.15, 1));
  });

  describe("calcTotalCost", () => {
    it("calculates with commissions", () => {
      const cost = service.calcTotalCost(2500, 2, 1.5, 10000);
      expect(cost).toBeGreaterThan(2500);
    });
  });

  describe("calcParamsRating", () => {
    it("all 5.0 = 5.0", () => {
      expect(service.calcParamsRating(Array(20).fill(5.0), Array(20).fill(2))).toBe(5.0);
    });
  });

  describe("calcTotalRating", () => {
    it("combines price and params", () => {
      expect(service.calcTotalRating(5.0, 4.0, 0.6, 0.4)).toBeCloseTo(4.6, 2);
    });
  });

  describe("scoreAllParams", () => {
    it("returns 20 scores", () => {
      const scores = service.scoreAllParams({
        transferCommission: 0, deposit: 5000, depositReturnDays: 0,
        latePenalty: 0, trafficFinePenalty: 0, terminationDays: 1,
        contractFairness: 5, contractMatch: 5, daysOff: 5,
        newDriverPromoDays: 6, maxPromoDaysInClass: 6,
        replacementCar: 5, insurance: 5, inspectionFreq: 5,
        maintenanceDay: 5, extraScratch: 5, repairDowntime: 5,
        selfRepair: 3, repairPricing: 3,
      }, { minDepositInClass: 5000, minTerminationInClass: 1 });

      expect(scores).toHaveLength(20);
      expect(scores.every((s) => s >= 0.01 && s <= 5.0)).toBe(true);
    });
  });
});
