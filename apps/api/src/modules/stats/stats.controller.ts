import {
  Controller, Get, Param, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "@taxibrat/shared";
import { ManagerStatsService } from "./manager-stats.service";
import { OverallStatsService } from "./overall-stats.service";

@Controller("admin/stats")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(
    private managerStatsService: ManagerStatsService,
    private overallStatsService: OverallStatsService,
  ) {}

  @Get("managers")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  listManagers() {
    return this.managerStatsService.listManagers();
  }

  @Get("managers/:id")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  getManagerDetails(
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const range = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    return this.managerStatsService.getManagerDetails(id, range);
  }

  @Get("overall")
  @Roles(UserRole.ADMIN)
  getOverall(
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const range = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    return this.overallStatsService.getOverall(range);
  }

  @Get("users/chart")
  @Roles(UserRole.ADMIN)
  usersChart(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy: "day" | "week" | "month" = "day",
  ) {
    const { fromD, toD } = resolveRange(from, to);
    return this.overallStatsService.getUsersByPeriod(fromD, toD, groupBy);
  }

  @Get("points/chart")
  @Roles(UserRole.ADMIN)
  pointsChart(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy: "day" | "week" | "month" = "day",
  ) {
    const { fromD, toD } = resolveRange(from, to);
    return this.overallStatsService.getPointsByPeriod(fromD, toD, groupBy);
  }

  @Get("orders/chart")
  @Roles(UserRole.ADMIN)
  ordersChart(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy: "day" | "week" | "month" = "day",
  ) {
    const { fromD, toD } = resolveRange(from, to);
    return this.overallStatsService.getOrdersByPeriod(fromD, toD, groupBy);
  }
}

function resolveRange(from?: string, to?: string) {
  const toD = to ? new Date(to) : new Date();
  const fromD = from ? new Date(from) : new Date(toD.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { fromD, toD };
}
