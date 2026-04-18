import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditService } from "./audit.service";
import { UserRole, AuditEntity } from "@taxibrat/shared";

@Controller("admin/audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  search(
    @Query("entity") entity?: AuditEntity,
    @Query("actorId") actorId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.auditService.search({
      entity,
      actorId,
      from,
      to,
      search,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
    });
  }
}
