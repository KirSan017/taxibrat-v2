import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ReferralsService } from "./referrals.service";
import { referralFriendsSchema, ReferralFriendsDto } from "@taxibrat/shared";

@Controller("referrals")
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get("my-link")
  getMyLink(@CurrentUser() user: JwtPayload) {
    return this.referralsService.getMyLink(user.sub);
  }

  @Get("friends")
  getFriends(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(referralFriendsSchema)) dto: ReferralFriendsDto,
  ) {
    return this.referralsService.getFriends(user.sub, dto.page, dto.limit);
  }

  @Get("stats")
  getStats(@CurrentUser() user: JwtPayload) {
    return this.referralsService.getStats(user.sub);
  }
}
