import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CooperationService } from "./cooperation.service";
import {
  UserRole,
  createCooperationRequestSchema,
  CreateCooperationRequestDto,
  listCooperationRequestsSchema,
  ListCooperationRequestsDto,
} from "@taxibrat/shared";

@Controller()
export class CooperationController {
  constructor(private cooperationService: CooperationService) {}

  // Public endpoint — no auth
  @Post("cooperation")
  create(
    @Body(new ZodValidationPipe(createCooperationRequestSchema))
    dto: CreateCooperationRequestDto,
  ) {
    return this.cooperationService.create(dto);
  }

  // Admin endpoints
  @Get("admin/cooperation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  list(
    @Query(new ZodValidationPipe(listCooperationRequestsSchema))
    dto: ListCooperationRequestsDto,
  ) {
    return this.cooperationService.list(dto);
  }

  @Post("admin/cooperation/:id/read")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  markRead(@Param("id") id: string) {
    return this.cooperationService.markRead(id);
  }
}
