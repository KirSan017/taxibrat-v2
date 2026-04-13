import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TicketsController } from "./tickets.controller";
import { TicketsAdminController } from "./tickets.admin.controller";
import { TicketsService } from "./tickets.service";
import { TicketDistributorService } from "./ticket-distributor.service";
import { MessagesService } from "./messages.service";
import { ChatGateway } from "./chat.gateway";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [TicketsController, TicketsAdminController],
  providers: [
    TicketsService,
    TicketDistributorService,
    MessagesService,
    ChatGateway,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
