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
