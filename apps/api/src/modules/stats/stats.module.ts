import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StatsController } from "./stats.controller";
import { ManagerStatsService } from "./manager-stats.service";
import { OverallStatsService } from "./overall-stats.service";

@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [ManagerStatsService, OverallStatsService],
})
export class StatsModule {}
