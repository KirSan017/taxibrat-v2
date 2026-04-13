import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ClassesService } from "./classes.service";
import { UserRole, createClassSchema, updateClassSchema, CreateClassDto, UpdateClassDto } from "@taxibrat/shared";

@Controller("admin/parks/:parkId/classes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Post()
  create(
    @Param("parkId") parkId: string,
    @Body(new ZodValidationPipe(createClassSchema)) dto: CreateClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.create(parkId, dto, user.sub);
  }

  @Get()
  list(@Param("parkId") parkId: string) {
    return this.classesService.listByPark(parkId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClassSchema)) dto: UpdateClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.update(id, dto, user.sub);
  }

  @Post(":id/copy")
  copy(
    @Param("id") id: string,
    @Body("driverClass") driverClass: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.copy(id, driverClass, user.sub);
  }
}
