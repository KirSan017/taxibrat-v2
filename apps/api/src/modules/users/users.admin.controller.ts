import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  listUsers(
    @CurrentUser() viewer: JwtPayload,
    @Query(new ZodValidationPipe(listUsersSchema)) dto: ListUsersDto,
  ) {
    return this.usersService.listUsers(dto, viewer);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  async getUser(@Param("id") id: string, @CurrentUser() viewer: JwtPayload) {
    return this.usersService.getByIdMasked(id, viewer);
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

  @Post(":id/impersonate")
  @Roles(UserRole.ADMIN)
  async impersonate(
    @Param("id") id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.usersService.impersonate(admin.sub, id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.usersService.deleteUser(admin.sub, id);
  }

  @Patch(":id/visibility-flags")
  @Roles(UserRole.ADMIN)
  async updateVisibilityFlags(
    @Param("id") id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: {
      canViewUserPhone?: boolean;
      canViewUserEmail?: boolean;
      canViewUserBirthDate?: boolean;
    },
  ) {
    return this.usersService.updateVisibilityFlags(admin.sub, id, dto);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN)
  async changeRole(
    @Param("id") id: string,
    @Body() dto: { role: UserRole },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.usersService.changeRole(admin.sub, id, dto.role);
  }
}
