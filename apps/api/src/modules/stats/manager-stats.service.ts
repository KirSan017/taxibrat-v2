import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, no9Orders, users } from "@taxibrat/db";

interface DateRange {
  from?: Date;
  to?: Date;
}

@Injectable()
export class ManagerStatsService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async listManagers() {
    const managers = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(
        sql`${users.role} IN ('MANAGER', 'SUPER_MANAGER')`,
      );

    const summaries = await Promise.all(
      managers.map(async (m) => {
        const stats = await this.getManagerSummary(m.id);
        return { ...m, ...stats };
      }),
    );

    return summaries;
  }

  async getManagerSummary(managerId: string) {
    const [ticketStats] = await this.db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${tickets.status} = 'COMPLETED')`,
        smRejected: sql<number>`count(*) filter (where ${tickets.status} = 'SM_REJECTED')`,
      })
      .from(tickets)
      .where(eq(tickets.assignedToId, managerId));

    const [orderStats] = await this.db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${no9Orders.status} = 'ORDERED')`,
      })
      .from(no9Orders)
      .where(eq(no9Orders.assignedToId, managerId));

    return {
      tickets: {
        total: Number(ticketStats.total),
        completed: Number(ticketStats.completed),
        smRejected: Number(ticketStats.smRejected),
      },
      orders: {
        total: Number(orderStats.total),
        completed: Number(orderStats.completed),
      },
    };
  }

  async getManagerDetails(managerId: string, range: DateRange) {
    const ticketsByTopic = await this.getTicketsByTopic(managerId, range);
    const firstResponseTime = await this.getFirstResponseTime(managerId, range);
    const orderResponseBuckets = await this.getOrderResponseBuckets(managerId, range);
    const smRejections = await this.getSmRejections(managerId, range);

    return {
      ticketsByTopic,
      firstResponseTime,
      orderResponseBuckets,
      smRejections,
    };
  }

  private async getTicketsByTopic(managerId: string, range: DateRange) {
    const conditions = [eq(tickets.assignedToId, managerId)];
    if (range.from) conditions.push(gte(tickets.createdAt, range.from));
    if (range.to) conditions.push(lte(tickets.createdAt, range.to));

    const rows = await this.db
      .select({
        topic: tickets.topic,
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${tickets.status} = 'COMPLETED')`,
        rejected: sql<number>`count(*) filter (where ${tickets.status} = 'SM_REJECTED')`,
      })
      .from(tickets)
      .where(and(...conditions))
      .groupBy(tickets.topic);

    return rows.map((r) => ({
      topic: r.topic,
      total: Number(r.total),
      completed: Number(r.completed),
      rejected: Number(r.rejected),
    }));
  }

  private async getFirstResponseTime(managerId: string, range: DateRange) {
    // First manager message after ticket creation, grouped by response time buckets
    const conditions = [eq(tickets.assignedToId, managerId)];
    if (range.from) conditions.push(gte(tickets.createdAt, range.from));
    if (range.to) conditions.push(lte(tickets.createdAt, range.to));

    const rows = await this.db.execute(sql`
      WITH first_response AS (
        SELECT
          t.id AS ticket_id,
          MIN(tm.created_at) AS first_msg_at,
          t.created_at AS ticket_created_at,
          EXTRACT(EPOCH FROM MIN(tm.created_at) - t.created_at) AS response_seconds
        FROM tickets t
        JOIN ticket_messages tm ON tm.ticket_id = t.id
          AND tm.sender_id = t.assigned_to_id
          AND tm.is_system = false
        WHERE t.assigned_to_id = ${managerId}
          ${range.from ? sql`AND t.created_at >= ${range.from}` : sql``}
          ${range.to ? sql`AND t.created_at <= ${range.to}` : sql``}
        GROUP BY t.id
      )
      SELECT
        count(*) filter (where response_seconds < 30) AS under_30s,
        count(*) filter (where response_seconds >= 30 AND response_seconds < 60) AS s30_to_1m,
        count(*) filter (where response_seconds >= 60) AS over_1m,
        round(avg(response_seconds)::numeric, 1) AS avg_seconds
      FROM first_response
    `);

    const row = (rows as any)[0] ?? {};
    return {
      under30s: Number(row.under_30s ?? 0),
      s30To1m: Number(row.s30_to_1m ?? 0),
      over1m: Number(row.over_1m ?? 0),
      avgSeconds: Number(row.avg_seconds ?? 0),
    };
  }

  private async getOrderResponseBuckets(managerId: string, range: DateRange) {
    const rows = await this.db.execute(sql`
      SELECT
        count(*) AS total,
        count(*) filter (where EXTRACT(EPOCH FROM completed_at - assigned_at) < 60) AS under_1m,
        count(*) filter (where EXTRACT(EPOCH FROM completed_at - assigned_at) >= 60
          AND EXTRACT(EPOCH FROM completed_at - assigned_at) < 120) AS m1_to_2,
        count(*) filter (where EXTRACT(EPOCH FROM completed_at - assigned_at) >= 120
          AND EXTRACT(EPOCH FROM completed_at - assigned_at) < 180) AS m2_to_3,
        count(*) filter (where EXTRACT(EPOCH FROM completed_at - assigned_at) >= 180) AS over_3m,
        round(avg(EXTRACT(EPOCH FROM completed_at - assigned_at))::numeric, 1) AS avg_seconds
      FROM no9_orders
      WHERE assigned_to_id = ${managerId}
        AND completed_at IS NOT NULL
        AND assigned_at IS NOT NULL
        ${range.from ? sql`AND created_at >= ${range.from}` : sql``}
        ${range.to ? sql`AND created_at <= ${range.to}` : sql``}
    `);

    const row = (rows as any)[0] ?? {};
    return {
      total: Number(row.total ?? 0),
      under1m: Number(row.under_1m ?? 0),
      m1To2: Number(row.m1_to_2 ?? 0),
      m2To3: Number(row.m2_to_3 ?? 0),
      over3m: Number(row.over_3m ?? 0),
      avgSeconds: Number(row.avg_seconds ?? 0),
    };
  }

  private async getSmRejections(managerId: string, range: DateRange) {
    const conditions = [
      eq(tickets.assignedToId, managerId),
      eq(tickets.status, "SM_REJECTED" as any),
    ];
    if (range.from) conditions.push(gte(tickets.createdAt, range.from));
    if (range.to) conditions.push(lte(tickets.createdAt, range.to));

    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(...conditions));

    return Number(result.count);
  }
}
