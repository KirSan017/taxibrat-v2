import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ManagersController } from "./managers.controller";
import { ManagersService } from "./managers.service";

@Module({
  imports: [AuthModule],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
