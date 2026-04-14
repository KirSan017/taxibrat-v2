import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersController } from "./orders.controller";
import { OrdersAdminController } from "./orders.admin.controller";
import { OrdersService } from "./orders.service";
import { OrdersDistributorService } from "./orders.distributor";

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [
    OrdersService,
    OrdersDistributorService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
