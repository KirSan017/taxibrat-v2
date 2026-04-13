import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { parkClasses, parkVehicles } from "@taxibrat/db";
import { CreateClassDto, UpdateClassDto } from "@taxibrat/shared";
import { RatingRecalculator } from "../rating/rating.recalculator";

/** Convert numeric DTO fields to strings for decimal DB columns */
function toDbValues(dto: CreateClassDto | UpdateClassDto): Record<string, unknown> {
  const result: Record<string, unknown> = { ...dto };
  const decimalFields = [
    "parkCommission", "withdrawalCommission", "transferCommission",
    "newDriverPromoDays", "maxPromoDaysInClass",
  ];
  for (const field of decimalFields) {
    if (field in result && result[field] !== undefined) {
      result[field] = String(result[field]);
    }
  }
  return result;
}

@Injectable()
export class ClassesService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  async create(parkId: string, dto: CreateClassDto, userId: string) {
    try {
      const [cls] = await this.db
        .insert(parkClasses)
        .values({ ...toDbValues(dto), parkId, lastUpdatedBy: userId } as any)
        .returning();
      await this.recalculator.recalcClass(cls.id);
      await this.recalculator.recalcPark(parkId);
      return cls;
    } catch {
      throw new ConflictException("This class already exists for this park");
    }
  }

  async listByPark(parkId: string) {
    return this.db.select().from(parkClasses).where(eq(parkClasses.parkId, parkId));
  }

  async update(classId: string, dto: UpdateClassDto, userId: string) {
    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    if (!cls) throw new NotFoundException("Class not found");

    const [updated] = await this.db
      .update(parkClasses)
      .set({ ...toDbValues(dto), lastUpdatedBy: userId } as any)
      .where(eq(parkClasses.id, classId))
      .returning();

    await this.recalculator.recalcClass(classId);
    await this.recalculator.recalcPark(cls.parkId);
    return updated;
  }

  async copy(classId: string, newDriverClass: string, userId: string) {
    const [source] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    if (!source) throw new NotFoundException("Source class not found");

    const { id, createdAt, updatedAt, rating, paramsRating, hasAvailableCars, driverClass, ...data } = source;
    const [copied] = await this.db
      .insert(parkClasses)
      .values({ ...data, driverClass: newDriverClass as any, lastUpdatedBy: userId })
      .returning();

    return copied;
  }
}
