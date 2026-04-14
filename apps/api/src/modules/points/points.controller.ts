import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PointsService } from "./points.service";
import { pointsHistorySchema, PointsHistoryDto, POINTS } from "@taxibrat/shared";

@Controller("points")
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get("balance")
  async getBalance(@CurrentUser() user: JwtPayload) {
    const balance = await this.pointsService.getBalance(user.sub);
    return { balance, displayBalance: balance + POINTS.DISPLAY_OFFSET };
  }

  @Get("history")
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(pointsHistorySchema)) dto: PointsHistoryDto,
  ) {
    return this.pointsService.getHistory(user.sub, dto.page, dto.limit);
  }
}
