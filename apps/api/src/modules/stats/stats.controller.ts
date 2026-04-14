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
}
