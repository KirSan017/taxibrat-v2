import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RatingService } from "./rating.service";
import { RatingRecalculator } from "./rating.recalculator";
import { RatingAdminController } from "./rating.admin.controller";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RatingAdminController],
  providers: [RatingService, RatingRecalculator],
  exports: [RatingService, RatingRecalculator],
})
export class RatingModule {}
