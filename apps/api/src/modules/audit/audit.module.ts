import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditInterceptor } from "../../common/interceptors/audit.interceptor";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
