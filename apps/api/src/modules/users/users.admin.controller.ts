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

  @Post(":id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  approveUser(@Param("id") id: string) {
    return this.usersService.approveUser(id);
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  rejectUser(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectUserSchema)) dto: RejectUserDto,
  ) {
    return this.usersService.rejectUser(id, dto.reason);
  }
}
