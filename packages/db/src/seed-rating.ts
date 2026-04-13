import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ratingWeights } from "./schema/rating-weights";
import { ratingConfig } from "./schema/rating-config";
import { classRevenue } from "./schema/class-revenue";

const PARAM_WEIGHTS: Array<{ paramName: string; weight: "LOW" | "MEDIUM" | "HIGH" }> = [
  { paramName: "parkCommission", weight: "MEDIUM" },
  { paramName: "withdrawalCommission", weight: "MEDIUM" },
  { paramName: "transferCommission", weight: "MEDIUM" },
  { paramName: "deposit", weight: "HIGH" },
  { paramName: "depositReturnDays", weight: "MEDIUM" },
  { paramName: "latePenalty", weight: "MEDIUM" },
  { paramName: "trafficFinePenalty", weight: "MEDIUM" },
  { paramName: "terminationDays", weight: "MEDIUM" },
  { paramName: "contractFairness", weight: "MEDIUM" },
  { paramName: "contractMatch", weight: "MEDIUM" },
  { paramName: "daysOff", weight: "MEDIUM" },
  { paramName: "newDriverPromoDays", weight: "HIGH" },
  { paramName: "replacementCar", weight: "MEDIUM" },
  { paramName: "insurance", weight: "HIGH" },
  { paramName: "inspectionFreq", weight: "MEDIUM" },
  { paramName: "maintenanceDay", weight: "MEDIUM" },
  { paramName: "extraScratch", weight: "HIGH" },
  { paramName: "repairDowntime", weight: "HIGH" },
  { paramName: "selfRepair", weight: "MEDIUM" },
  { paramName: "repairPricing", weight: "MEDIUM" },
];

const REVENUE = [
  { driverClass: "ECONOMY" as const, dailyRevenue: 10000 },
  { driverClass: "COMFORT" as const, dailyRevenue: 11000 },
  { driverClass: "COMFORT_PLUS" as const, dailyRevenue: 12500 },
  { driverClass: "BUSINESS" as const, dailyRevenue: 16000 },
  { driverClass: "PREMIER" as const, dailyRevenue: 20000 },
  { driverClass: "ELITE" as const, dailyRevenue: 25000 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding rating weights...");
  for (const pw of PARAM_WEIGHTS) {
    await db.insert(ratingWeights).values(pw).onConflictDoNothing({ target: ratingWeights.paramName });
  }

  console.log("Seeding rating config...");
  const existing = await db.select().from(ratingConfig).limit(1);
  if (existing.length === 0) {
    await db.insert(ratingConfig).values({ priceCoefficient: "0.60", paramsCoefficient: "0.40" });
  }

  console.log("Seeding class revenue...");
  for (const rev of REVENUE) {
    await db.insert(classRevenue).values(rev).onConflictDoNothing({ target: classRevenue.driverClass });
  }

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
