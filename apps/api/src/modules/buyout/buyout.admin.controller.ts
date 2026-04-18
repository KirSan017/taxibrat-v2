import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BuyoutService } from "./buyout.service";
import {
  UserRole,
  createBuyoutSchema, updateBuyoutSchema, listBuyoutSchema,
  approveBuyoutSchema, rejectBuyoutSchema,
  CreateBuyoutDto, UpdateBuyoutDto, ListBuyoutDto,
  ApproveBuyoutDto, RejectBuyoutDto,
} from "@taxibrat/shared";

@Controller("admin/buyout")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuyoutAdminController {
  constructor(private buyoutService: BuyoutService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  list(@Query(new ZodValidationPipe(listBuyoutSchema)) dto: ListBuyoutDto) {
    return this.buyoutService.listAdmin(dto);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  getById(@Param("id") id: string) {
    return this.buyoutService.getById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createBuyoutSchema)) dto: CreateBuyoutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buyoutService.create(dto, user.sub);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  update(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateBuyoutSchema)) dto: UpdateBuyoutDto,
  ) {
    return this.buyoutService.update(id, dto, user.sub);
  }

  @Post(":id/submit")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  submit(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.buyoutService.submit(id, user.sub);
  }

  @Post(":id/approve")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  approve(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(approveBuyoutSchema)) dto: ApproveBuyoutDto,
  ) {
    return this.buyoutService.approve(id, user.sub, dto);
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  reject(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(rejectBuyoutSchema)) _dto: RejectBuyoutDto,
  ) {
    return this.buyoutService.reject(id, user.sub);
  }

  @Post(":id/archive")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  archive(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.buyoutService.archive(id, user.sub);
  }

  @Post(":id/restore")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  restore(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.buyoutService.restore(id, user.sub);
  }
}
