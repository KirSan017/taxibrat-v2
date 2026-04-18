import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PointsService } from "./points.service";
import { pointsHistorySchema, PointsHistoryDto } from "@taxibrat/shared";

@Controller("points")
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get("balance")
  async getBalance(@CurrentUser() user: JwtPayload) {
    const balance = await this.pointsService.getBalance(user.sub);
    // displayBalance matches actual balance (no synthetic +615 offset).
    return { balance, displayBalance: balance };
  }

  @Get("history")
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(pointsHistorySchema)) dto: PointsHistoryDto,
  ) {
    return this.pointsService.getHistory(user.sub, dto.page, dto.limit);
  }
}
