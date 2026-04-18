import { Injectable, Inject, Logger, NotFoundException } from "@nestjs/common";
import { eq, sql, desc, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { cooperationRequests } from "@taxibrat/db";
import {
  CreateCooperationRequestDto,
  ListCooperationRequestsDto,
} from "@taxibrat/shared";

@Injectable()
export class CooperationService {
  private readonly logger = new Logger(CooperationService.name);

  constructor(@Inject("DATABASE") private db: Database) {}

  async create(dto: CreateCooperationRequestDto) {
    const [row] = await this.db
      .insert(cooperationRequests)
      .values({
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        message: dto.message,
      })
      .returning();

    this.logger.log(
      `New cooperation request: id=${row.id}, name="${dto.name}", phone="${dto.phone ?? ""}", email="${dto.email ?? ""}"`,
    );

    return { success: true, id: row.id };
  }

  async list(dto: ListCooperationRequestsDto) {
    const conditions = [];
    if (typeof dto.isRead === "boolean") {
      conditions.push(eq(cooperationRequests.isRead, dto.isRead));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countRow, unreadRow] = await Promise.all([
      this.db
        .select()
        .from(cooperationRequests)
        .where(where)
        .orderBy(desc(cooperationRequests.createdAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(cooperationRequests)
        .where(where),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(cooperationRequests)
        .where(eq(cooperationRequests.isRead, false)),
    ]);

    return {
      data,
      total: Number(countRow[0].count),
      unread: Number(unreadRow[0].count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async markRead(id: string) {
    const [existing] = await this.db
      .select({ id: cooperationRequests.id })
      .from(cooperationRequests)
      .where(eq(cooperationRequests.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Cooperation request not found");

    await this.db
      .update(cooperationRequests)
      .set({ isRead: true })
      .where(eq(cooperationRequests.id, id));
    return { success: true };
  }
}
