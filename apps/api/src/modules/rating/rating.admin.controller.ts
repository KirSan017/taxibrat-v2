import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "@taxibrat/shared";
import type { Database } from "@taxibrat/db";
import { ratingWeights, ratingConfig, classRevenue } from "@taxibrat/db";
import { RatingRecalculator } from "./rating.recalculator";

@Controller("admin/rating")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RatingAdminController {
  constructor(
    @Inject("DATABASE") private db: Database,
    private recalculator: RatingRecalculator,
  ) {}

  @Get("weights")
  getWeights() {
    return this.db.select().from(ratingWeights);
  }

  @Patch("weights")
  async updateWeights(@Body() updates: Array<{ paramName: string; weight: string }>) {
    for (const u of updates) {
      await this.db
        .update(ratingWeights)
        .set({ weight: u.weight as any })
        .where(eq(ratingWeights.paramName, u.paramName));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Get("config")
  async getConfig() {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    return config;
  }

  @Patch("config")
  async updateConfig(@Body() body: { priceCoefficient: string; paramsCoefficient: string }) {
    const [config] = await this.db.select().from(ratingConfig).limit(1);
    if (config) {
      await this.db
        .update(ratingConfig)
        .set(body)
        .where(eq(ratingConfig.id, config.id));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Get("revenue")
  getRevenue() {
    return this.db.select().from(classRevenue);
  }

  @Patch("revenue")
  async updateRevenue(@Body() updates: Array<{ driverClass: string; dailyRevenue: number }>) {
    for (const u of updates) {
      await this.db
        .update(classRevenue)
        .set({ dailyRevenue: u.dailyRevenue })
        .where(eq(classRevenue.driverClass, u.driverClass as any));
    }
    await this.recalculator.recalcAll();
    return { success: true };
  }

  @Post("recalculate")
  async recalculate() {
    await this.recalculator.recalcAll();
    return { success: true };
  }
}
