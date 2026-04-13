import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { parkVehicles, parkClasses } from "@taxibrat/db";
import { CreateVehicleDto, UpdateVehicleDto } from "@taxibrat/shared";
import { RatingRecalculator } from "../rating/rating.recalculator";

@Injectable()
export class VehiclesService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  async create(classId: string, dto: CreateVehicleDto) {
    const [vehicle] = await this.db
      .insert(parkVehicles)
      .values({ ...dto, classId })
      .returning();

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, classId)).limit(1);
    await this.recalculator.recalcVehicle(vehicle.id);
    await this.recalculator.recalcClass(classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return vehicle;
  }

  async update(vehicleId: string, dto: UpdateVehicleDto) {
    const [vehicle] = await this.db.select().from(parkVehicles).where(eq(parkVehicles.id, vehicleId)).limit(1);
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    const [updated] = await this.db
      .update(parkVehicles)
      .set(dto)
      .where(eq(parkVehicles.id, vehicleId))
      .returning();

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, vehicle.classId)).limit(1);
    await this.recalculator.recalcVehicle(vehicleId);
    await this.recalculator.recalcClass(vehicle.classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return updated;
  }

  async delete(vehicleId: string) {
    const [vehicle] = await this.db.select().from(parkVehicles).where(eq(parkVehicles.id, vehicleId)).limit(1);
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    await this.db.delete(parkVehicles).where(eq(parkVehicles.id, vehicleId));

    const [cls] = await this.db.select().from(parkClasses).where(eq(parkClasses.id, vehicle.classId)).limit(1);
    await this.recalculator.recalcClass(vehicle.classId);
    if (cls) await this.recalculator.recalcPark(cls.parkId);

    return { success: true };
  }
}
