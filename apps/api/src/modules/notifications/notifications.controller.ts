import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";
import { listNotificationsSchema, ListNotificationsDto } from "@taxibrat/shared";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listNotificationsSchema)) dto: ListNotificationsDto,
  ) {
    return this.notificationsService.list(user.sub, dto);
  }

  @Patch(":id/read")
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }
}
