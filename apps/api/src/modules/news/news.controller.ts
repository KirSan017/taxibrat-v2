import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { NewsService } from "./news.service";
import {
  UserRole, createNewsSchema, updateNewsSchema, listNewsSchema,
  CreateNewsDto, UpdateNewsDto, ListNewsDto,
} from "@taxibrat/shared";

@Controller()
export class NewsController {
  constructor(private newsService: NewsService) {}

  // Public
  @Get("news")
  list(@Query(new ZodValidationPipe(listNewsSchema)) dto: ListNewsDto) {
    return this.newsService.list(dto.page, dto.limit);
  }

  @Get("news/:id")
  getById(@Param("id") id: string) {
    return this.newsService.getById(id);
  }

  // Admin
  @Post("admin/news")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createNewsSchema)) dto: CreateNewsDto,
  ) {
    return this.newsService.create(dto.title, dto.body, dto.linkUrl, user.sub);
  }

  @Get("admin/news")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  listAdmin(@Query(new ZodValidationPipe(listNewsSchema)) dto: ListNewsDto) {
    return this.newsService.listAdmin(dto.page, dto.limit);
  }

  @Patch("admin/news/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNewsSchema)) dto: UpdateNewsDto,
  ) {
    return this.newsService.update(id, dto);
  }

  @Delete("admin/news/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.newsService.delete(id);
  }
}
