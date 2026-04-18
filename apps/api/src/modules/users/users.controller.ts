import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UsePipes,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import { updateProfileSchema, UpdateProfileDto } from "@taxibrat/shared";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getById(user.sub);
  }

  @Patch("me")
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post("me/photo")
  async updatePhoto(
    @CurrentUser() user: JwtPayload,
    @Body() body: { photoBase64?: string; photoUrl?: string },
  ) {
    let photoUrl: string | null = null;
    if (body.photoBase64) {
      const raw = body.photoBase64.trim();
      // Accept either data:image/... prefix or raw base64
      const dataUrl = raw.startsWith("data:image/")
        ? raw
        : `data:image/jpeg;base64,${raw}`;
      // Basic size guard: max ~2MB in base64 (roughly 2.8MB string)
      if (dataUrl.length > 3_000_000) {
        throw new BadRequestException("Фото слишком большое (максимум ~2 МБ)");
      }
      photoUrl = dataUrl;
    } else if (body.photoUrl) {
      photoUrl = body.photoUrl;
    } else {
      throw new BadRequestException("Нужно передать photoBase64 или photoUrl");
    }
    return this.usersService.updatePhoto(user.sub, photoUrl);
  }
}
