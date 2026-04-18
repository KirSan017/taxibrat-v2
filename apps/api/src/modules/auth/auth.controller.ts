import { Controller, Post, Body, UsePipes } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  sendCodeSchema,
  verifyCodeSchema,
  refreshTokenSchema,
  SendCodeDto,
  VerifyCodeDto,
  RefreshTokenDto,
} from "@taxibrat/shared";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("send-code")
  @UsePipes(new ZodValidationPipe(sendCodeSchema))
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto.phone, dto.method);
  }

  @Post("verify")
  @UsePipes(new ZodValidationPipe(verifyCodeSchema))
  verify(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.phone, dto.code, dto.referralCode);
  }

  @Post("refresh")
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
