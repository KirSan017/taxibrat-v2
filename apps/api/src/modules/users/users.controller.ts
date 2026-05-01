import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import {
  updateProfileSchema,
  UpdateProfileDto,
  uploadDocumentSchema,
  UploadDocumentDto,
} from "@taxibrat/shared";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getById(user.sub);
  }

  @Patch("me")
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    if (!user?.sub) {
      console.error("PATCH /users/me: user.sub is undefined. user =", JSON.stringify(user));
      throw new BadRequestException("Невалидный токен авторизации — перезайдите в аккаунт");
    }
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post("me/document")
  uploadDocument(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(uploadDocumentSchema)) dto: UploadDocumentDto,
  ) {
    return this.usersService.updateDocument(user.sub, dto.documentType, dto.base64);
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

  /* ── Phone change flow ────────────────────────── */

  @Post("me/change-phone/send-code")
  requestPhoneChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { newPhone: string; method: "SMS" | "TELEGRAM" },
  ) {
    if (!dto?.newPhone) throw new BadRequestException("Укажите новый номер");
    const method = dto.method === "TELEGRAM" ? "TELEGRAM" : "SMS";
    return this.usersService.requestPhoneChange(user.sub, dto.newPhone, method);
  }

  @Post("me/change-phone/verify")
  confirmPhoneChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { newPhone: string; code: string },
  ) {
    if (!dto?.newPhone || !dto?.code) {
      throw new BadRequestException("Укажите номер и код");
    }
    return this.usersService.confirmPhoneChange(user.sub, dto.newPhone, dto.code);
  }
}
