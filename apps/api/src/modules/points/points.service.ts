import {
  Injectable, Inject, BadRequestException, Logger,
} from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { pointsTransactions, users } from "@taxibrat/db";
import { PointsTransactionType, NotificationType } from "@taxibrat/shared";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { AuditService } from "../audit/audit.service";
import { AuditAction, AuditEntity } from "@taxibrat/shared";

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private auditService: AuditService,
  ) {}

  async award(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    description: string,
    ticketId?: string,
    createdById?: string,
  ) {
    if (amount <= 0) throw new BadRequestException("Award amount must be positive");

    await this.db.insert(pointsTransactions).values({
      userId,
      amount,
      type,
      description,
      relatedTicketId: ticketId,
      createdById,
    });

    await this.db.execute(
      sql`UPDATE users SET friendship_points = friendship_points + ${amount} WHERE id = ${userId}`
    );

    await this.notificationsService.create({
      userId,
      type: NotificationType.POINTS,
      title: "Начислены баллы дружбы",
      body: `+${amount} баллов: ${description}`,
    });
    this.notificationsGateway.pushToUser(userId, { type: "points-update", amount });

    this.logger.log(`Points awarded: ${userId} +${amount} (${type})`);
  }

  async charge(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    description: string,
  ) {
    if (amount <= 0) throw new BadRequestException("Charge amount must be positive");

    const [user] = await this.db
      .select({ friendshipPoints: users.friendshipPoints })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.friendshipPoints < amount) {
      throw new BadRequestException("Недостаточно баллов дружбы");
    }

    await this.db.insert(pointsTransactions).values({
      userId,
      amount: -amount,
      type,
      description,
    });

    await this.db.execute(
      sql`UPDATE users SET friendship_points = friendship_points - ${amount} WHERE id = ${userId}`
    );

    this.logger.log(`Points charged: ${userId} -${amount} (${type})`);
  }

  async manualAdjust(
    adminId: string,
    userId: string,
    amount: number,
    description: string,
  ) {
    if (amount > 0) {
      await this.award(userId, amount, PointsTransactionType.MANUAL_ADMIN, description, undefined, adminId);
    } else if (amount < 0) {
      await this.charge(userId, Math.abs(amount), PointsTransactionType.MANUAL_ADMIN, description);
    }

    await this.auditService.log({
      actorId: adminId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.POINTS,
      entityId: userId,
      newValue: { amount, description },
    });
  }

  async getBalance(userId: string): Promise<number> {
    const [user] = await this.db
      .select({ friendshipPoints: users.friendshipPoints })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.friendshipPoints ?? 0;
  }

  async getHistory(userId: string, page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getLeaderboard(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          friendshipPoints: users.friendshipPoints,
        })
        .from(users)
        .orderBy(desc(users.friendshipPoints))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)`, total: sql<number>`sum(friendship_points)` })
        .from(users),
    ]);

    return {
      data,
      totalUsers: Number(countResult[0].count),
      totalPoints: Number(countResult[0].total),
      page,
      limit,
    };
  }
}
