import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { notifications } from "@taxibrat/db";
import { NotificationType, ListNotificationsDto } from "@taxibrat/shared";

@Injectable()
export class NotificationsService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    const [notification] = await this.db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async list(userId: string, dto: ListNotificationsDto) {
    const [data, countResult, unreadResult] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.isRead, desc(notifications.createdAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        ),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      unread: Number(unreadResult[0].count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async markRead(userId: string, notificationId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }
}
