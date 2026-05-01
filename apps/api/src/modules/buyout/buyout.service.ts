import {
  Injectable, Inject, NotFoundException, ConflictException,
} from "@nestjs/common";
import { eq, and, sql, desc, asc, gte, lte } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { buyoutListings, carBrands, carModels } from "@taxibrat/db";
import {
  CreateBuyoutDto, UpdateBuyoutDto, ApproveBuyoutDto, ListBuyoutDto,
  BuyoutStatus, TicketTopic,
  AuditAction, AuditEntity,
} from "@taxibrat/shared";
import { TicketsService } from "../tickets/tickets.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class BuyoutService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private ticketsService: TicketsService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateBuyoutDto, userId: string) {
    // Generate title from brand + model + year
    const title = await this.generateTitle(dto.brandId, dto.modelId, dto.year);

    try {
      const [listing] = await this.db
        .insert(buyoutListings)
        .values({
          ...dto,
          title,
          createdById: userId,
          status: "DRAFT",
        })
        .returning();

      await this.auditService.log({
        actorId: userId,
        action: AuditAction.CREATE,
        entity: AuditEntity.BUYOUT_LISTING,
        entityId: listing.id,
        newValue: listing,
      });

      return listing;
    } catch (err: any) {
      if (err.code === "23505" && err.constraint_name?.includes("vin7")) {
        throw new ConflictException("Listing with this VIN already exists");
      }
      throw err;
    }
  }

  async getById(id: string) {
    const [listing] = await this.db
      .select()
      .from(buyoutListings)
      .where(eq(buyoutListings.id, id))
      .limit(1);
    if (!listing) throw new NotFoundException("Buyout listing not found");
    return listing;
  }

  async getPublicById(id: string) {
    const listing = await this.getById(id);
    if (listing.status !== "ACTIVE") throw new NotFoundException("Buyout listing not found");
    return this.stripOwnerFields(listing);
  }

  async listPublic(dto: ListBuyoutDto) {
    const conditions = [eq(buyoutListings.status, "ACTIVE" as any)];
    this.applyFilters(conditions, dto);

    const [data, countResult] = await Promise.all([
      this.db.select().from(buyoutListings)
        .where(and(...conditions))
        .orderBy(
          desc(buyoutListings.isAdvertised),
          asc(buyoutListings.price),
        )
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(buyoutListings)
        .where(and(...conditions)),
    ]);

    return {
      data: data.map((d) => this.stripOwnerFields(d)),
      total: Number(countResult[0].count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async listAdmin(dto: ListBuyoutDto) {
    const conditions: any[] = [];
    if (dto.status) conditions.push(eq(buyoutListings.status, dto.status as any));
    this.applyFilters(conditions, dto);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.select().from(buyoutListings)
        .where(where)
        .orderBy(desc(buyoutListings.createdAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(buyoutListings)
        .where(where),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async update(id: string, dto: UpdateBuyoutDto, actorId?: string) {
    const listing = await this.getById(id);

    // Regenerate title if brand/model/year changed
    let title = listing.title;
    const brandId = dto.brandId ?? listing.brandId;
    const modelId = dto.modelId ?? listing.modelId;
    const year = dto.year ?? listing.year;
    if (dto.brandId || dto.modelId || dto.year) {
      title = await this.generateTitle(brandId, modelId, year);
    }

    const [updated] = await this.db
      .update(buyoutListings)
      .set({ ...dto, title })
      .where(eq(buyoutListings.id, id))
      .returning();

    if (actorId) {
      await this.auditService.log({
        actorId,
        action: AuditAction.UPDATE,
        entity: AuditEntity.BUYOUT_LISTING,
        entityId: id,
        oldValue: listing,
        newValue: updated,
      });
    }

    return updated;
  }

  async submit(id: string, actorId?: string) {
    const listing = await this.getById(id);
    const [updated] = await this.db
      .update(buyoutListings)
      .set({ status: "PENDING_REVIEW" as any })
      .where(eq(buyoutListings.id, id))
      .returning();

    if (actorId) {
      await this.auditService.log({
        actorId,
        action: AuditAction.STATUS_CHANGE,
        entity: AuditEntity.BUYOUT_LISTING,
        entityId: id,
        oldValue: { status: listing.status },
        newValue: { status: "PENDING_REVIEW" },
      });
    }

    return updated;
  }

  async approve(id: string, smId: string, dto: ApproveBuyoutDto) {
    const listing = await this.getById(id);
    const [updated] = await this.db
      .update(buyoutListings)
      .set({
        status: "ACTIVE" as any,
        reviewedById: smId,
        ...(dto.ownerName && { ownerName: dto.ownerName }),
        ...(dto.ownerContact && { ownerContact: dto.ownerContact }),
        ...(dto.ownerAddress && { ownerAddress: dto.ownerAddress }),
        ...(dto.ownerPhone && { ownerPhone: dto.ownerPhone }),
      })
      .where(eq(buyoutListings.id, id))
      .returning();

    await this.auditService.log({
      actorId: smId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.BUYOUT_LISTING,
      entityId: id,
      oldValue: { status: listing.status },
      newValue: { status: "ACTIVE" },
    });

    return updated;
  }

  async reject(id: string, smId: string, reason?: string) {
    const listing = await this.getById(id);
    const [updated] = await this.db
      .update(buyoutListings)
      .set({
        status: "DRAFT" as any,
        reviewedById: smId,
        rejectionReason: reason ?? null,
      })
      .where(eq(buyoutListings.id, id))
      .returning();

    await this.auditService.log({
      actorId: smId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.BUYOUT_LISTING,
      entityId: id,
      oldValue: { status: listing.status, rejectionReason: listing.rejectionReason },
      newValue: { status: "DRAFT", rejectionReason: reason ?? null },
    });

    return updated;
  }

  async archive(id: string, actorId?: string) {
    const listing = await this.getById(id);
    const [updated] = await this.db
      .update(buyoutListings)
      .set({ status: "ARCHIVED" as any })
      .where(eq(buyoutListings.id, id))
      .returning();

    if (actorId) {
      await this.auditService.log({
        actorId,
        action: AuditAction.STATUS_CHANGE,
        entity: AuditEntity.BUYOUT_LISTING,
        entityId: id,
        oldValue: { status: listing.status },
        newValue: { status: "ARCHIVED" },
      });
    }

    return updated;
  }

  async restore(id: string, actorId?: string) {
    const listing = await this.getById(id);
    const [updated] = await this.db
      .update(buyoutListings)
      .set({ status: "ACTIVE" as any })
      .where(eq(buyoutListings.id, id))
      .returning();

    if (actorId) {
      await this.auditService.log({
        actorId,
        action: AuditAction.STATUS_CHANGE,
        entity: AuditEntity.BUYOUT_LISTING,
        entityId: id,
        oldValue: { status: listing.status },
        newValue: { status: "ACTIVE" },
      });
    }

    return updated;
  }

  async book(listingId: string, userId: string) {
    const listing = await this.getById(listingId);
    if (listing.status !== "ACTIVE") {
      throw new NotFoundException("Listing is not available for booking");
    }

    const ticket = await this.ticketsService.create(userId, {
      topic: TicketTopic.BUYOUT,
      body: `Заявка на выкуп: ${listing.title}, цена ${listing.price} ₽`,
      relatedEntityId: listingId,
    });

    return ticket;
  }

  async similar(id: string, limit = 8) {
    const listing = await this.getById(id);
    // Per ТЗ: похожие — это объявления той же марки (и желательно года).
    const data = await this.db
      .select()
      .from(buyoutListings)
      .where(
        and(
          eq(buyoutListings.status, "ACTIVE" as any),
          eq(buyoutListings.brandId, listing.brandId),
          sql`${buyoutListings.id} != ${id}`,
        ),
      )
      .orderBy(desc(buyoutListings.isAdvertised), desc(buyoutListings.price))
      .limit(limit);

    return data.map((d) => this.stripOwnerFields(d));
  }

  private applyFilters(conditions: any[], dto: ListBuyoutDto) {
    if (dto.brandId) conditions.push(eq(buyoutListings.brandId, dto.brandId));
    if (dto.modelId) conditions.push(eq(buyoutListings.modelId, dto.modelId));
    if (dto.year) conditions.push(eq(buyoutListings.year, dto.year));
    if (dto.ownerType) conditions.push(eq(buyoutListings.ownerType, dto.ownerType as any));
    if (dto.priceFrom) conditions.push(gte(buyoutListings.price, dto.priceFrom));
    if (dto.priceTo) conditions.push(lte(buyoutListings.price, dto.priceTo));
  }

  private stripOwnerFields(listing: any) {
    const { ownerName, ownerContact, ownerAddress, ownerPhone, ...rest } = listing;
    return rest;
  }

  private async generateTitle(brandId: string, modelId: string, year: number): Promise<string> {
    const [brand] = await this.db
      .select({ name: carBrands.name })
      .from(carBrands)
      .where(eq(carBrands.id, brandId))
      .limit(1);
    const [model] = await this.db
      .select({ name: carModels.name })
      .from(carModels)
      .where(eq(carModels.id, modelId))
      .limit(1);

    const brandName = brand?.name ?? "Unknown";
    const modelName = model?.name ?? "Unknown";
    return `${brandName} ${modelName} ${year}`;
  }
}
