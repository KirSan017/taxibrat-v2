import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { VisibilityService } from "./visibility.service";

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, VisibilityService],
})
export class CatalogModule {}
