import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { OrdersService } from "./orders.service";
import {
  createNo9OrderSchema, listNo9OrdersSchema,
  CreateNo9OrderDto, ListNo9OrdersDto,
} from "@taxibrat/shared";

@Controller("orders/no9")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createNo9OrderSchema)) dto: CreateNo9OrderDto,
  ) {
    return this.ordersService.create(user.sub, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listNo9OrdersSchema)) dto: ListNo9OrdersDto,
  ) {
    return this.ordersService.listForUser(user.sub, dto);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ordersService.cancel(id, user.sub);
  }
}
