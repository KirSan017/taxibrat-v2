import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ManagersService } from "./managers.service";
import { UserRole, ManagerSection } from "@taxibrat/shared";

@Controller("managers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
export class ManagersController {
  constructor(private managersService: ManagersService) {}

  @Get("settings")
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.managersService.getSettings(user.sub);
  }

  @Get("settings/all")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  getAllSettings() {
    return this.managersService.getAllSettings();
  }

  @Patch("settings/:section")
  toggleStatus(
    @CurrentUser() user: JwtPayload,
    @Param("section") section: ManagerSection,
  ) {
    return this.managersService.toggleStatus(user.sub, section);
  }
}
