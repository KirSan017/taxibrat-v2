import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { AUDIT_KEY, AuditMeta } from "../decorators/auditable.decorator";
import { AuditService } from "../../modules/audit/audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest();
    const actorId = request.user?.sub;
    if (!actorId) return next.handle();

    const entityId =
      meta.entityIdParam && request.params[meta.entityIdParam]
        ? request.params[meta.entityIdParam]
        : undefined;

    return next.handle().pipe(
      tap((result) => {
        this.auditService
          .log({
            actorId,
            action: meta.action,
            entity: meta.entity,
            entityId: entityId || (result as Record<string, unknown>)?.id as string || "unknown",
            newValue: result,
          })
          .catch(() => {});
      }),
    );
  }
}
