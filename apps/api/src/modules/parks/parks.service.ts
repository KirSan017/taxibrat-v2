import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { taxiParks, parkClasses } from "@taxibrat/db";
import { CreateParkDto, UpdateParkDto, AuditAction, AuditEntity } from "@taxibrat/shared";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ParksService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateParkDto, userId: string) {
    const [park] = await this.db
      .insert(taxiParks)
      .values({ ...dto, createdById: userId })
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.PARK,
      entityId: park.id,
      newValue: park,
    });

    return park;
  }

  async getById(id: string) {
    const [park] = await this.db.select().from(taxiParks).where(eq(taxiParks.id, id)).limit(1);
    if (!park) throw new NotFoundException("Park not found");
    return park;
  }

  async list(page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db.select().from(taxiParks)
        .orderBy(taxiParks.createdAt)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ count: sql<number>`count(*)` }).from(taxiParks),
    ]);
    return { data, total: Number(countResult[0].count), page, limit };
  }

  async update(id: string, dto: UpdateParkDto, userId: string) {
    const previous = await this.getById(id);
    const [updated] = await this.db
      .update(taxiParks)
      .set(dto)
      .where(eq(taxiParks.id, id))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.PARK,
      entityId: id,
      oldValue: previous,
      newValue: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const previous = await this.getById(id);
    await this.db.delete(taxiParks).where(eq(taxiParks.id, id));

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.PARK,
      entityId: id,
      oldValue: previous,
    });

    return { success: true };
  }
}
