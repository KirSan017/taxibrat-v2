import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serviceSettings } from "./schema/service-settings";

const DEFAULTS: Array<{ key: string; value: string }> = [
  { key: "points_registration", value: "100" },
  { key: "points_park_check", value: "150" },
  { key: "points_taxi_connect", value: "150" },
  { key: "points_buyout", value: "1000" },
  { key: "points_idea", value: "50" },
  { key: "points_referral_register", value: "200" },
  { key: "points_referral_bonus", value: "100" },
  { key: "points_base_check_cost", value: "50" },
  { key: "points_order_no9_cost", value: "50" },
  { key: "points_order_cancel_cost", value: "15" },
  { key: "no9_enabled", value: "true" },
  { key: "banner_url", value: "" },
  { key: "points_review_enabled", value: "false" },
  { key: "points_review_date", value: "" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding service settings...");
  for (const s of DEFAULTS) {
    await db
      .insert(serviceSettings)
      .values(s)
      .onConflictDoNothing({ target: serviceSettings.key });
  }

  console.log("Settings seed complete.");
  await client.end();
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
