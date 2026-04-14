import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BuyoutService } from "./buyout.service";
import {
  createBuyoutSchema, listBuyoutSchema,
  CreateBuyoutDto, ListBuyoutDto,
} from "@taxibrat/shared";

@Controller("buyout")
export class BuyoutController {
  constructor(private buyoutService: BuyoutService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listBuyoutSchema)) dto: ListBuyoutDto) {
    return this.buyoutService.listPublic(dto);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.buyoutService.getPublicById(id);
  }

  @Get(":id/similar")
  similar(@Param("id") id: string) {
    return this.buyoutService.similar(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body(new ZodValidationPipe(createBuyoutSchema)) dto: CreateBuyoutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyoutService.create(dto, user.sub);
  }

  @Post(":id/book")
  @UseGuards(JwtAuthGuard)
  book(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.buyoutService.book(id, user.sub);
  }
}
