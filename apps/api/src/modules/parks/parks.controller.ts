import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ParksService } from "./parks.service";
import { UserRole, createParkSchema, updateParkSchema, CreateParkDto, UpdateParkDto } from "@taxibrat/shared";

@Controller("admin/parks")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParksController {
  constructor(private parksService: ParksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createParkSchema)) dto: CreateParkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.parksService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  list(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.parksService.list(parseInt(page), Math.min(parseInt(limit), 100));
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  getById(@Param("id") id: string) {
    return this.parksService.getById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateParkSchema)) dto: UpdateParkDto) {
    return this.parksService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.parksService.delete(id);
  }
}
