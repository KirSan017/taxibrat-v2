import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { managerSettings, no9Orders } from "@taxibrat/db";
import type Redis from "ioredis";

const EXPIRE_MINUTES = 30;

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

  /**
   * Every 5 minutes: expire NO9 orders stuck in PENDING for more than
   * EXPIRE_MINUTES. Marks them as EXPIRED so managers and users see the
   * final state instead of an infinitely-pending order.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);
    const result = await this.db
      .update(no9Orders)
      .set({
        status: "EXPIRED" as any,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(no9Orders.status, "PENDING" as any),
          lt(no9Orders.createdAt, cutoff),
        ),
      )
      .returning({ id: no9Orders.id });

    if (result.length > 0) {
      this.logger.log(`Expired ${result.length} stale NO9 orders (> ${EXPIRE_MINUTES} min in PENDING)`);
    }
  }
}
