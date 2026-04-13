import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";
import { DaDataProvider } from "./dadata.provider";

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [BrandsService, DaDataProvider],
  exports: [BrandsService],
})
export class BrandsModule {}
