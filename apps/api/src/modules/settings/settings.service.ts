import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { serviceSettings } from "@taxibrat/db";
import type Redis from "ioredis";

const CACHE_PREFIX = "settings:";
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class SettingsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async get(key: string): Promise<string | null> {
    const cached = await this.redis.get(`${CACHE_PREFIX}${key}`);
    if (cached !== null) return cached;

    const [row] = await this.db
      .select()
      .from(serviceSettings)
      .where(eq(serviceSettings.key, key))
      .limit(1);

    if (!row) return null;

    await this.redis.set(`${CACHE_PREFIX}${key}`, row.value, "EX", CACHE_TTL);
    return row.value;
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const val = await this.get(key);
    if (val === null) return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val === "true";
  }

  async set(key: string, value: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(serviceSettings)
      .where(eq(serviceSettings.key, key))
      .limit(1);

    if (existing) {
      await this.db
        .update(serviceSettings)
        .set({ value })
        .where(eq(serviceSettings.key, key));
    } else {
      await this.db
        .insert(serviceSettings)
        .values({ key, value });
    }

    await this.redis.del(`${CACHE_PREFIX}${key}`);
  }

  async getAll(): Promise<Array<{ key: string; value: string }>> {
    return this.db
      .select({ key: serviceSettings.key, value: serviceSettings.value })
      .from(serviceSettings)
      .orderBy(serviceSettings.key);
  }

  async getPointsConfig() {
    const all = await this.getAll();
    const map = new Map(all.map((s) => [s.key, s.value]));
    return {
      registration: parseInt(map.get("points_registration") ?? "100", 10),
      parkCheck: parseInt(map.get("points_park_check") ?? "150", 10),
      taxiConnect: parseInt(map.get("points_taxi_connect") ?? "150", 10),
      buyout: parseInt(map.get("points_buyout") ?? "1000", 10),
      idea: parseInt(map.get("points_idea") ?? "50", 10),
      referralRegister: parseInt(map.get("points_referral_register") ?? "200", 10),
      referralBonus: parseInt(map.get("points_referral_bonus") ?? "100", 10),
      baseCheckCost: parseInt(map.get("points_base_check_cost") ?? "50", 10),
      orderNo9Cost: parseInt(map.get("points_order_no9_cost") ?? "50", 10),
      orderCancelCost: parseInt(map.get("points_order_cancel_cost") ?? "15", 10),
    };
  }
}
