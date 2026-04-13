import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { auditLog, users } from "@taxibrat/db";
import { AuditAction, AuditEntity } from "@taxibrat/shared";

@Injectable()
export class AuditService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async log(data: {
    actorId: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    await this.db.insert(auditLog).values({
      actorId: data.actorId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
    });
  }

  async search(params: {
    entity?: AuditEntity;
    actorId?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [];
    if (params.entity) conditions.push(eq(auditLog.entity, params.entity));
    if (params.actorId) conditions.push(eq(auditLog.actorId, params.actorId));
    if (params.from) conditions.push(gte(auditLog.createdAt, new Date(params.from)));
    if (params.to) conditions.push(lte(auditLog.createdAt, new Date(params.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: auditLog.id,
          actorId: auditLog.actorId,
          actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          action: auditLog.action,
          entity: auditLog.entity,
          entityId: auditLog.entityId,
          oldValue: auditLog.oldValue,
          newValue: auditLog.newValue,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLog)
        .where(where),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      page: params.page,
      limit: params.limit,
    };
  }
}
