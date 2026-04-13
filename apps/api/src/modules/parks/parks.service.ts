import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { taxiParks, parkClasses } from "@taxibrat/db";
import { CreateParkDto, UpdateParkDto } from "@taxibrat/shared";

@Injectable()
export class ParksService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(dto: CreateParkDto, userId: string) {
    const [park] = await this.db
      .insert(taxiParks)
      .values({ ...dto, createdById: userId })
      .returning();
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

  async update(id: string, dto: UpdateParkDto) {
    await this.getById(id);
    const [updated] = await this.db
      .update(taxiParks)
      .set(dto)
      .where(eq(taxiParks.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.delete(taxiParks).where(eq(taxiParks.id, id));
    return { success: true };
  }
}
