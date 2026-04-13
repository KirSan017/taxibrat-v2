import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BrandsService } from "./brands.service";
import {
  UserRole,
  createBrandSchema,
  createModelSchema,
  CreateBrandDto,
  CreateModelDto,
} from "@taxibrat/shared";

@Controller()
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  // Public endpoints for catalog filters
  @Get("catalog/brands")
  getAllBrands() {
    return this.brandsService.getAllBrands();
  }

  @Get("catalog/models")
  getModels(@Query("brandId") brandId: string) {
    return this.brandsService.getModelsByBrand(brandId);
  }

  // Admin endpoints
  @Post("admin/brands")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  createBrand(@Body(new ZodValidationPipe(createBrandSchema)) dto: CreateBrandDto) {
    return this.brandsService.createBrand(dto.name);
  }

  @Post("admin/models")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  createModel(@Body(new ZodValidationPipe(createModelSchema)) dto: CreateModelDto) {
    return this.brandsService.createModel(dto.brandId, dto.name);
  }

  @Get("admin/brands/search")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_MANAGER, UserRole.MANAGER)
  searchBrands(@Query("q") q: string) {
    return this.brandsService.searchBrands(q || "");
  }
}
