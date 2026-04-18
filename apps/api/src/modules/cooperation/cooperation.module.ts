import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CooperationController } from "./cooperation.controller";
import { CooperationService } from "./cooperation.service";

@Module({
  imports: [AuthModule],
  controllers: [CooperationController],
  providers: [CooperationService],
  exports: [CooperationService],
})
export class CooperationModule {}
