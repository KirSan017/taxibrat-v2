import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PointsController } from "./points.controller";
import { PointsAdminController } from "./points.admin.controller";
import { PointsService } from "./points.service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PointsController, PointsAdminController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
