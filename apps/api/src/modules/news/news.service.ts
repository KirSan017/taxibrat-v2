import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { news, users, notifications } from "@taxibrat/db";
import { NotificationType } from "@taxibrat/shared";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@Injectable()
export class NewsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(title: string, body: string, linkUrl: string | undefined, createdById: string) {
    const [item] = await this.db
      .insert(news)
      .values({ title, body, linkUrl, createdById })
      .returning();

    // Mass-create notifications for all active users
    await this.db.execute(sql`
      INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
      SELECT gen_random_uuid(), id, 'NEWS', ${title}, ${body}, ${`/news/${item.id}`}, false, now()
      FROM users WHERE status = 'ACTIVE'
    `);

    // WS broadcast to all connected clients
    this.notificationsGateway.server?.emit("notification", {
      type: "news",
      newsId: item.id,
      title,
    });

    return item;
  }

  async list(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(news)
        .where(eq(news.isPublished, true))
        .orderBy(desc(news.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(news)
        .where(eq(news.isPublished, true)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async listAdmin(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(news)
        .orderBy(desc(news.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ count: sql<number>`count(*)` }).from(news),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getById(id: string) {
    const [item] = await this.db.select().from(news).where(eq(news.id, id)).limit(1);
    if (!item) throw new NotFoundException("News not found");
    return item;
  }

  async update(id: string, data: { title?: string; body?: string; linkUrl?: string | null; isPublished?: boolean }) {
    await this.getById(id);
    const [updated] = await this.db
      .update(news)
      .set(data)
      .where(eq(news.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.delete(news).where(eq(news.id, id));
    return { success: true };
  }
}
