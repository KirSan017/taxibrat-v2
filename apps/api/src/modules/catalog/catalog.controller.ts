import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CatalogService } from "./catalog.service";
import { VisibilityService } from "./visibility.service";
import { catalogQuerySchema, CatalogQueryDto } from "@taxibrat/shared";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";

@Controller("catalog")
export class CatalogController {
  constructor(
    private catalogService: CatalogService,
    private visibilityService: VisibilityService,
    private configService: ConfigService,
  ) {}

  private extractUser(req: any) {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    try {
      return verify(auth.slice(7), this.configService.get("JWT_SECRET")!) as {
        sub: string;
        role: string;
      };
    } catch {
      return null;
    }
  }

  @Get("classes")
  async listClasses(
    @Query(new ZodValidationPipe(catalogQuerySchema)) dto: CatalogQueryDto,
    @Req() req: any,
  ) {
    const user = this.extractUser(req);
    const classes = await this.catalogService.listClasses(dto);
    return this.visibilityService.applyMask(classes as any, user);
  }

  @Get("homepage")
  async listHomepage(@Query("limit") limitStr: string | undefined, @Req() req: any) {
    const user = this.extractUser(req);
    const limit = Math.min(Math.max(parseInt(limitStr || "8", 10) || 8, 1), 20);
    const classes = await this.catalogService.listHomepageSlider(limit);
    return this.visibilityService.applyMask(classes as any, user);
  }

  @Get("classes/:id")
  async getClass(@Param("id") id: string, @Req() req: any) {
    const user = this.extractUser(req);
    const detail = await this.catalogService.getClassDetail(id);
    if (!detail) return { error: "Not found" };

    const [masked] = await this.visibilityService.applyMask(
      [
        {
          ...detail,
          parkName: detail.park?.name ?? "",
          parkAddress: detail.park?.address ?? null,
          parkPhone: detail.park?.phone ?? null,
          isAdvertised: detail.park?.isAdvertised ?? false,
          isSuperAdvertised: detail.park?.isSuperAdvertised ?? false,
        },
      ] as any,
      user,
    );
    return masked;
  }
}
