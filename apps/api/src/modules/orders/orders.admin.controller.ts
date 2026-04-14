import {
  Controller, Get, Post, Param, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { OrdersService } from "./orders.service";
import { UserRole, listNo9OrdersSchema, ListNo9OrdersDto } from "@taxibrat/shared";

@Controller("admin/orders/no9")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersAdminController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listNo9OrdersSchema)) dto: ListNo9OrdersDto,
  ) {
    return this.ordersService.listForManager(user.sub, dto);
  }

  @Post(":id/ordered")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  markOrdered(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ordersService.markOrdered(id, user.sub);
  }

  @Post(":id/banned")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  markBanned(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ordersService.markBanned(id, user.sub);
  }

  @Post(":id/five-min")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  fiveMin(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ordersService.fiveMin(id, user.sub);
  }

  @Get("status")
  @Roles(UserRole.ADMIN)
  featureStatus() {
    return this.ordersService.getFeatureStatus();
  }
}
