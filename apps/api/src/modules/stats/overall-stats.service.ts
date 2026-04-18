import { Injectable, Inject } from "@nestjs/common";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  users, tickets, no9Orders, taxiParks, parkClasses,
  parkVehicles, pointsTransactions,
} from "@taxibrat/db";

interface DateRange {
  from?: Date;
  to?: Date;
}

type GroupBy = "day" | "week" | "month";

function truncUnit(groupBy: GroupBy): string {
  return groupBy === "week" ? "week" : groupBy === "month" ? "month" : "day";
}

@Injectable()
export class OverallStatsService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async getOverall(range: DateRange) {
    const [userStats, pointsStats, ticketStats, orderStats, parkStats, priceStats] =
      await Promise.all([
        this.getUserStats(range),
        this.getPointsStats(range),
        this.getTicketStats(range),
        this.getOrderStats(range),
        this.getParkStats(),
        this.getPriceStats(),
      ]);

    return {
      users: userStats,
      points: pointsStats,
      tickets: ticketStats,
      orders: orderStats,
      parks: parkStats,
      prices: priceStats,
    };
  }

  private async getUserStats(range: DateRange) {
    const [totals] = await this.db
      .select({
        total: sql<number>`count(*)`,
        phoneVerified: sql<number>`count(*) filter (where ${users.status} = 'PHONE_VERIFIED')`,
        active: sql<number>`count(*) filter (where ${users.status} = 'ACTIVE')`,
      })
      .from(users);

    let inPeriod = 0;
    if (range.from || range.to) {
      const conditions = [];
      if (range.from) conditions.push(gte(users.createdAt, range.from));
      if (range.to) conditions.push(lte(users.createdAt, range.to));

      const [result] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...conditions));
      inPeriod = Number(result.count);
    }

    return {
      total: Number(totals.total),
      phoneVerified: Number(totals.phoneVerified),
      active: Number(totals.active),
      inPeriod,
    };
  }

  private async getPointsStats(range: DateRange) {
    const conditions = [];
    if (range.from) conditions.push(gte(pointsTransactions.createdAt, range.from));
    if (range.to) conditions.push(lte(pointsTransactions.createdAt, range.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await this.db
      .select({
        totalAwarded: sql<number>`coalesce(sum(${pointsTransactions.amount}) filter (where ${pointsTransactions.amount} > 0), 0)`,
        totalSpent: sql<number>`coalesce(abs(sum(${pointsTransactions.amount}) filter (where ${pointsTransactions.amount} < 0)), 0)`,
      })
      .from(pointsTransactions)
      .where(where);

    const [balanceResult] = await this.db
      .select({
        totalBalance: sql<number>`coalesce(sum(${users.friendshipPoints}), 0)`,
      })
      .from(users);

    return {
      totalAwarded: Number(result.totalAwarded),
      totalSpent: Number(result.totalSpent),
      totalBalance: Number(balanceResult.totalBalance),
    };
  }

  private async getTicketStats(range: DateRange) {
    const conditions = [];
    if (range.from) conditions.push(gte(tickets.createdAt, range.from));
    if (range.to) conditions.push(lte(tickets.createdAt, range.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        topic: tickets.topic,
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${tickets.status} = 'COMPLETED')`,
      })
      .from(tickets)
      .where(where)
      .groupBy(tickets.topic);

    return rows.map((r) => ({
      topic: r.topic,
      total: Number(r.total),
      completed: Number(r.completed),
    }));
  }

  private async getOrderStats(range: DateRange) {
    const conditions = [];
    if (range.from) conditions.push(gte(no9Orders.createdAt, range.from));
    if (range.to) conditions.push(lte(no9Orders.createdAt, range.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await this.db
      .select({
        total: sql<number>`count(*)`,
        ordered: sql<number>`count(*) filter (where ${no9Orders.status} = 'ORDERED')`,
        cancelled: sql<number>`count(*) filter (where ${no9Orders.status} = 'CANCELLED')`,
      })
      .from(no9Orders)
      .where(where);

    return {
      total: Number(result.total),
      ordered: Number(result.ordered),
      cancelled: Number(result.cancelled),
    };
  }

  private async getParkStats() {
    const [result] = await this.db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${taxiParks.status} = 'ACTIVE')`,
      })
      .from(taxiParks);

    const [commissionResult] = await this.db
      .select({
        avgCommission: sql<number>`round(avg(${parkClasses.parkCommission}::numeric), 2)`,
      })
      .from(parkClasses);

    return {
      total: Number(result.total),
      active: Number(result.active),
      avgCommission: Number(commissionResult.avgCommission ?? 0),
    };
  }

  async getUsersByPeriod(from: Date, to: Date, groupBy: GroupBy) {
    const unit = truncUnit(groupBy);
    const rows = await this.db.execute(sql`
      SELECT
        date_trunc(${unit}, created_at) AS bucket,
        count(*) AS total,
        count(*) FILTER (WHERE status = 'PHONE_VERIFIED') AS phone_verified,
        count(*) FILTER (WHERE status = 'ACTIVE') AS active
      FROM users
      WHERE created_at >= ${from} AND created_at <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);
    return ((rows as any) ?? []).map((r: any) => ({
      date: r.bucket,
      total: Number(r.total ?? 0),
      phoneVerified: Number(r.phone_verified ?? 0),
      active: Number(r.active ?? 0),
    }));
  }

  async getPointsByPeriod(from: Date, to: Date, groupBy: GroupBy) {
    const unit = truncUnit(groupBy);
    const rows = await this.db.execute(sql`
      SELECT
        date_trunc(${unit}, created_at) AS bucket,
        coalesce(sum(amount) FILTER (WHERE amount > 0), 0) AS awarded,
        coalesce(abs(sum(amount) FILTER (WHERE amount < 0)), 0) AS spent
      FROM points_transactions
      WHERE created_at >= ${from} AND created_at <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);
    return ((rows as any) ?? []).map((r: any) => ({
      date: r.bucket,
      awarded: Number(r.awarded ?? 0),
      spent: Number(r.spent ?? 0),
    }));
  }

  async getOrdersByPeriod(from: Date, to: Date, groupBy: GroupBy) {
    const unit = truncUnit(groupBy);
    const rows = await this.db.execute(sql`
      SELECT
        date_trunc(${unit}, created_at) AS bucket,
        count(*) AS total,
        count(*) FILTER (WHERE status = 'ORDERED') AS ordered,
        count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
      FROM no9_orders
      WHERE created_at >= ${from} AND created_at <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);
    return ((rows as any) ?? []).map((r: any) => ({
      date: r.bucket,
      total: Number(r.total ?? 0),
      ordered: Number(r.ordered ?? 0),
      cancelled: Number(r.cancelled ?? 0),
    }));
  }

  private async getPriceStats() {
    const rows = await this.db.execute(sql`
      SELECT
        pc.driver_class,
        round(avg(pv.rent_price)::numeric, 0) AS avg_rent_price,
        count(pv.id) AS vehicle_count
      FROM park_vehicles pv
      JOIN park_classes pc ON pc.id = pv.class_id
      GROUP BY pc.driver_class
      ORDER BY pc.driver_class
    `);

    return ((rows as any) ?? []).map((r: any) => ({
      driverClass: r.driver_class,
      avgRentPrice: Number(r.avg_rent_price ?? 0),
      vehicleCount: Number(r.vehicle_count ?? 0),
    }));
  }
}
