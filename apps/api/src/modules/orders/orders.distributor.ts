import { Injectable, Inject, Logger } from "@nestjs/common";
import { and, eq, lt } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { managerSettings } from "@taxibrat/db";
import type Redis from "ioredis";

@Injectable()
export class OrdersDistributorService {
  private readonly logger = new Logger(OrdersDistributorService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
  ) {}

  /**
   * Pick the next available NO_9_PERCENT manager via round-robin.
   * Only managers who are WORKING and have fiveMinCount < 3 are eligible.
   * Returns userId or null if nobody is available.
   */
  async pickManager(): Promise<string | null> {
    const activeManagers = await this.db
      .select({ userId: managerSettings.userId })
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, "NO_9_PERCENT" as any),
          eq(managerSettings.workStatus, "WORKING"),
          lt(managerSettings.fiveMinCount, 3),
        ),
      );

    if (activeManagers.length === 0) {
      this.logger.warn("No available NO_9_PERCENT managers");
      return null;
    }

    const counter = await this.redis.incr("round_robin:NO_9_PERCENT");
    const index = (counter - 1) % activeManagers.length;
    const assignedToId = activeManagers[index].userId;

    this.logger.log(`Order assigned to manager ${assignedToId}`);
    return assignedToId;
  }
}
