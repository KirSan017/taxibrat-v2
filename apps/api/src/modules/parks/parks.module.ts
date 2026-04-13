import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ParksController } from "./parks.controller";
import { ParksService } from "./parks.service";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule],
  controllers: [ParksController, ClassesController, VehiclesController],
  providers: [ParksService, ClassesService, VehiclesService],
  exports: [ParksService, ClassesService, VehiclesService],
})
export class ParksModule {}
