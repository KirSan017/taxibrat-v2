import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import { parkClasses } from "./schema/park-classes";
import { parkVehicles } from "./schema/park-vehicles";
import { taxiParks } from "./schema/taxi-parks";
import { classRevenue } from "./schema/class-revenue";

function clamp(v: number): number {
  return Math.max(0.01, Math.min(5.0, Math.round(v * 100) / 100));
}

function calcCost(rent: number, parkComm: number, withdrawal: number, revenue: number): number {
  const pc = revenue * (parkComm / 100);
  const net = revenue - revenue * 0.25 - pc;
  const wc = net * (withdrawal / 100);
  return rent + pc + wc;
}

function scoreParam(name: string, val: number, context: { minDeposit: number; minTermination: number }): number {
  switch (name) {
    case "transferCommission": return clamp(5 - val * 1.5);
    case "deposit": return clamp(5 - ((val - context.minDeposit) / 1000) * 0.1);
    case "depositReturnDays": return clamp(5 - val * 0.15);
    case "latePenalty": return clamp(5 - (val / 100) * 0.1);
    case "trafficFinePenalty": return clamp(5 - (val / 10) * 0.2);
    case "terminationDays": return clamp(5 - (val - context.minTermination) * 0.2);
    case "selfRepair":
    case "repairPricing":
      return clamp(val === 1 ? 1 : val === 2 ? 3 : 5);
    default: return clamp(val); // direct mapping 1-5
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Loading revenue...");
  const revenues = await db.select().from(classRevenue);
  const revenueMap = new Map(revenues.map((r) => [r.driverClass, r.dailyRevenue]));

  const allClasses = await db.select().from(parkClasses);
  console.log(`Recalculating ${allClasses.length} classes...`);

  // Step 1: calc params rating for each class
  const classContexts = new Map<string, { minDeposit: number; minTermination: number }>();
  for (const dc of ["ECONOMY", "COMFORT", "COMFORT_PLUS", "BUSINESS", "PREMIER", "ELITE"]) {
    const classes = allClasses.filter((c) => c.driverClass === dc);
    const minDeposit = Math.min(...classes.map((c) => c.deposit), 0);
    const minTermination = Math.min(...classes.map((c) => c.terminationDays), 0);
    for (const c of classes) {
      classContexts.set(c.id, { minDeposit, minTermination });
    }
  }

  for (const cls of allClasses) {
    const ctx = classContexts.get(cls.id)!;
    const paramNames = [
      "transferCommission", "deposit", "depositReturnDays", "latePenalty",
      "trafficFinePenalty", "terminationDays", "contractFairness", "contractMatch",
      "daysOff", "replacementCar", "insurance", "inspectionFreq", "maintenanceDay",
      "extraScratch", "repairDowntime", "selfRepair", "repairPricing",
    ];
    let totalScore = 0;
    for (const name of paramNames) {
      const val = typeof (cls as any)[name] === "string" ? parseFloat((cls as any)[name]) : (cls as any)[name];
      totalScore += scoreParam(name, val, ctx);
    }
    // newDriverPromo
    const promoDays = parseFloat(String(cls.newDriverPromoDays));
    const maxPromo = parseFloat(String(cls.maxPromoDaysInClass)) || 6;
    totalScore += clamp(5 * (promoDays / maxPromo));

    const paramsRating = clamp(totalScore / 18);
    await db.update(parkClasses).set({ paramsRating: String(paramsRating) }).where(eq(parkClasses.id, cls.id));
  }

  // Step 2: calc price rating for each vehicle + total rating
  console.log("Calculating vehicle ratings...");
  const allVehicles = await db.select().from(parkVehicles);
  const vehicleClasses = new Map<string, typeof parkClasses.$inferSelect>();
  for (const c of allClasses) vehicleClasses.set(c.id, c);

  // Find best cost per driverClass
  const bestCostByClass = new Map<string, number>();
  for (const dc of ["ECONOMY", "COMFORT", "COMFORT_PLUS", "BUSINESS", "PREMIER", "ELITE"]) {
    const revenue = revenueMap.get(dc as any) || 10000;
    let best = Infinity;
    for (const v of allVehicles) {
      if (!v.isAvailable) continue;
      const cls = vehicleClasses.get(v.classId);
      if (!cls || cls.driverClass !== dc) continue;
      const cost = calcCost(
        v.rentPrice,
        parseFloat(String(cls.parkCommission)),
        parseFloat(String(cls.withdrawalCommission)),
        revenue,
      );
      if (cost < best) best = cost;
    }
    bestCostByClass.set(dc, best === Infinity ? 0 : best);
  }

  for (const v of allVehicles) {
    const cls = vehicleClasses.get(v.classId);
    if (!cls) continue;
    const revenue = revenueMap.get(cls.driverClass) || 10000;
    const best = bestCostByClass.get(cls.driverClass) || 0;
    const cost = calcCost(
      v.rentPrice,
      parseFloat(String(cls.parkCommission)),
      parseFloat(String(cls.withdrawalCommission)),
      revenue,
    );
    const priceRating = best > 0 ? clamp(5 * (best / cost)) : 0.01;
    const paramsRating = parseFloat(String(cls.paramsRating)) || 0.01;
    const totalRating = clamp(priceRating * 0.6 + paramsRating * 0.4);
    await db.update(parkVehicles).set({
      priceRating: String(priceRating),
      totalRating: String(totalRating),
    }).where(eq(parkVehicles.id, v.id));
  }

  // Step 3: calc class rating (avg of available vehicles)
  for (const cls of allClasses) {
    const vehicles = await db.select().from(parkVehicles)
      .where(and(eq(parkVehicles.classId, cls.id), eq(parkVehicles.isAvailable, true)));
    const hasAvailable = vehicles.length > 0;
    const avgRating = hasAvailable
      ? vehicles.reduce((s, v) => s + parseFloat(String(v.totalRating)), 0) / vehicles.length
      : 0;
    await db.update(parkClasses).set({
      rating: String(clamp(avgRating)),
      hasAvailableCars: hasAvailable,
    }).where(eq(parkClasses.id, cls.id));
  }

  // Step 4: calc park rating
  const allParks = await db.select().from(taxiParks);
  for (const park of allParks) {
    const classes = await db.select().from(parkClasses)
      .where(and(eq(parkClasses.parkId, park.id), eq(parkClasses.hasAvailableCars, true)));
    const avg = classes.length > 0
      ? classes.reduce((s, c) => s + parseFloat(String(c.rating)), 0) / classes.length
      : 0;
    await db.update(taxiParks).set({ rating: String(clamp(avg)) }).where(eq(taxiParks.id, park.id));
  }

  console.log("Done.");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
