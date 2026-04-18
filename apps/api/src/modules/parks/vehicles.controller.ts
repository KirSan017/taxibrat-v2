import {
  Controller, Post, Patch, Delete, Param, Body, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { VehiclesService } from "./vehicles.service";
import { UserRole, createVehicleSchema, updateVehicleSchema, CreateVehicleDto, UpdateVehicleDto } from "@taxibrat/shared";

@Controller("admin/classes/:classId/vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Param("classId") classId: string,
    @Body(new ZodValidationPipe(createVehicleSchema)) dto: CreateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.create(classId, dto, user.sub);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) dto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.update(id, dto, user.sub);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.delete(id, user.sub);
  }
}
