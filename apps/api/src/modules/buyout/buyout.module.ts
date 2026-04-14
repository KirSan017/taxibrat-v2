import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TicketsModule } from "../tickets/tickets.module";
import { BuyoutController } from "./buyout.controller";
import { BuyoutAdminController } from "./buyout.admin.controller";
import { BuyoutService } from "./buyout.service";

@Module({
  imports: [AuthModule, TicketsModule],
  controllers: [BuyoutController, BuyoutAdminController],
  providers: [BuyoutService],
  exports: [BuyoutService],
})
export class BuyoutModule {}
