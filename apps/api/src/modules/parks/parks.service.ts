import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { eq, sql, ilike, and, ne } from "drizzle-orm";
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
    let park;
    try {
      [park] = await this.db
        .insert(taxiParks)
        .values({ ...dto, createdById: userId })
        .returning();
    } catch (e: any) {
      // Postgres unique violation (23505) — phone already exists
      if (e?.code === "23505") {
        throw new ConflictException({
          message: "Таксопарк с таким телефоном уже существует",
          code: "DUPLICATE_PHONE",
        });
      }
      throw e;
    }

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.PARK,
      entityId: park.id,
      newValue: park,
    });

    return park;
  }

  async findDuplicatesByPhone(phone: string, excludeId?: string) {
    const conditions = [eq(taxiParks.phone, phone)];
    if (excludeId) conditions.push(ne(taxiParks.id, excludeId));
    return this.db
      .select({
        id: taxiParks.id,
        name: taxiParks.name,
        address: taxiParks.address,
        phone: taxiParks.phone,
      })
      .from(taxiParks)
      .where(and(...conditions))
      .limit(20);
  }

  async findDuplicatesByName(name: string, excludeId?: string) {
    const q = name.trim();
    if (q.length < 2) return [];
    const conditions = [ilike(taxiParks.name, `%${q}%`)];
    if (excludeId) conditions.push(ne(taxiParks.id, excludeId));
    return this.db
      .select({
        id: taxiParks.id,
        name: taxiParks.name,
        address: taxiParks.address,
        phone: taxiParks.phone,
      })
      .from(taxiParks)
      .where(and(...conditions))
      .limit(20);
  }

  async findDuplicatesByAddress(address: string, excludeId?: string) {
    const q = address.trim();
    if (q.length < 3) return [];
    const conditions = [ilike(taxiParks.address, `%${q}%`)];
    if (excludeId) conditions.push(ne(taxiParks.id, excludeId));
    return this.db
      .select({
        id: taxiParks.id,
        name: taxiParks.name,
        address: taxiParks.address,
        phone: taxiParks.phone,
      })
      .from(taxiParks)
      .where(and(...conditions))
      .limit(20);
  }

  async findDuplicates(filters: {
    phone?: string;
    name?: string;
    address?: string;
    excludeId?: string;
  }) {
    const map = new Map<string, any>();
    const pushAll = (list: any[]) => {
      for (const item of list) if (!map.has(item.id)) map.set(item.id, item);
    };
    if (filters.phone) pushAll(await this.findDuplicatesByPhone(filters.phone, filters.excludeId));
    if (filters.name) pushAll(await this.findDuplicatesByName(filters.name, filters.excludeId));
    if (filters.address) pushAll(await this.findDuplicatesByAddress(filters.address, filters.excludeId));
    return Array.from(map.values());
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

    // Aggregate hasAvailableCars flag across park_classes for each park
    const parkIds = data.map((p) => p.id);
    const availMap = new Map<string, boolean>();
    if (parkIds.length > 0) {
      const rows = await this.db
        .select({
          parkId: parkClasses.parkId,
          hasAny: sql<boolean>`bool_or(${parkClasses.hasAvailableCars})`,
        })
        .from(parkClasses)
        .where(sql`${parkClasses.parkId} = ANY(${parkIds})`)
        .groupBy(parkClasses.parkId);
      for (const r of rows) {
        availMap.set(r.parkId as string, Boolean(r.hasAny));
      }
    }

    const enriched = data.map((p) => ({
      ...p,
      hasAvailableCars: availMap.get(p.id) ?? false,
    }));

    return { data: enriched, total: Number(countResult[0].count), page, limit };
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

  async submitForReview(id: string, userId: string) {
    const previous = await this.getById(id);
    if (previous.status !== "DRAFT") {
      throw new ConflictException("Отправить на проверку можно только черновик (DRAFT)");
    }
    const [updated] = await this.db
      .update(taxiParks)
      .set({ status: "PENDING_REVIEW" as any })
      .where(eq(taxiParks.id, id))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.PARK,
      entityId: id,
      oldValue: { status: previous.status },
      newValue: { status: "PENDING_REVIEW" },
    });

    return updated;
  }

  async approveModeration(id: string, userId: string) {
    const previous = await this.getById(id);
    if (previous.status !== "PENDING_REVIEW") {
      throw new ConflictException("Одобрить можно только парк на проверке (PENDING_REVIEW)");
    }
    const [updated] = await this.db
      .update(taxiParks)
      .set({ status: "ACTIVE" as any })
      .where(eq(taxiParks.id, id))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.PARK,
      entityId: id,
      oldValue: { status: previous.status },
      newValue: { status: "ACTIVE" },
    });

    return updated;
  }

  async rejectModeration(id: string, userId: string, reason?: string) {
    const previous = await this.getById(id);
    if (previous.status !== "PENDING_REVIEW") {
      throw new ConflictException("Отклонить можно только парк на проверке (PENDING_REVIEW)");
    }
    const [updated] = await this.db
      .update(taxiParks)
      .set({ status: "DRAFT" as any })
      .where(eq(taxiParks.id, id))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.PARK,
      entityId: id,
      oldValue: { status: previous.status },
      newValue: { status: "DRAFT", rejectionReason: reason ?? null },
    });

    return updated;
  }
}
