import { SetMetadata } from "@nestjs/common";
import { AuditEntity, AuditAction } from "@taxibrat/shared";

export const AUDIT_KEY = "audit";

export interface AuditMeta {
  entity: AuditEntity;
  action: AuditAction;
  entityIdParam?: string;
}

export const Auditable = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
