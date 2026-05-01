import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SettingsService } from "./settings.service";
import { UserRole, updateSettingsSchema, UpdateSettingsDto } from "@taxibrat/shared";

@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  async update(
    @Body(new ZodValidationPipe(updateSettingsSchema)) dto: UpdateSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    for (const { key, value } of dto.updates) {
      await this.settingsService.set(key, value, user.sub);
    }
    return { success: true };
  }
}
