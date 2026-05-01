import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PointsService } from "./points.service";
import { UserRole, adjustPointsSchema, AdjustPointsDto } from "@taxibrat/shared";

@Controller("admin/points")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PointsAdminController {
  constructor(private pointsService: PointsService) {}

  @Post("adjust")
  adjust(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(adjustPointsSchema)) dto: AdjustPointsDto,
  ) {
    return this.pointsService.manualAdjust(user.sub, dto.userId, dto.amount, dto.description);
  }

  @Get("leaderboard")
  getLeaderboard(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.pointsService.getLeaderboard(parseInt(page), Math.min(parseInt(limit), 100));
  }
}
