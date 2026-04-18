import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import {
  UserRole,
  listUsersSchema,
  ListUsersDto,
  rejectUserSchema,
  RejectUserDto,
} from "@taxibrat/shared";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersAdminController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  listUsers(@Query(new ZodValidationPipe(listUsersSchema)) dto: ListUsersDto) {
    return this.usersService.listUsers(dto);
  }

  @Get(":id/duplicates")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  async getDuplicates(@Param("id") id: string) {
    const user = await this.usersService.getById(id);
    if (!user.firstName || !user.lastName) return [];
    return this.usersService.findDuplicatesByName(user.firstName, user.lastName, id);
  }

  @Post(":id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  approveUser(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.approveUser(id, user.sub);
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  rejectUser(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(rejectUserSchema)) dto: RejectUserDto,
  ) {
    return this.usersService.rejectUser(id, dto.reason, user.sub);
  }
}
