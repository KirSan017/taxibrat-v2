import { Controller, Get, Patch, Body, UseGuards, UsePipes } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
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
  @UsePipes(new ZodValidationPipe(updateSettingsSchema))
  async update(@Body() dto: UpdateSettingsDto) {
    for (const { key, value } of dto.updates) {
      await this.settingsService.set(key, value);
    }
    return { success: true };
  }
}
