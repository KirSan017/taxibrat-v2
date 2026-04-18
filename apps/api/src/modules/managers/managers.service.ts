import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { managerSettings } from "@taxibrat/db";
import { ManagerSection, WorkStatus, AuditAction, AuditEntity } from "@taxibrat/shared";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ManagersService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private auditService: AuditService,
  ) {}

  async getSettings(userId: string) {
    return this.db
      .select()
      .from(managerSettings)
      .where(eq(managerSettings.userId, userId));
  }

  async toggleStatus(userId: string, section: ManagerSection) {
    const [existing] = await this.db
      .select()
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.userId, userId),
          eq(managerSettings.section, section),
        ),
      )
      .limit(1);

    if (!existing) {
      const [created] = await this.db
        .insert(managerSettings)
        .values({ userId, section, workStatus: WorkStatus.WORKING })
        .returning();

      await this.auditService.log({
        actorId: userId,
        action: AuditAction.CREATE,
        entity: AuditEntity.MANAGER_STATUS,
        entityId: created.id,
        newValue: { section, workStatus: WorkStatus.WORKING },
      });

      return created;
    }

    const newStatus =
      existing.workStatus === WorkStatus.WORKING
        ? WorkStatus.RESTING
        : WorkStatus.WORKING;

    const [updated] = await this.db
      .update(managerSettings)
      .set({
        workStatus: newStatus,
        fiveMinCount: newStatus === WorkStatus.WORKING ? 0 : existing.fiveMinCount,
      })
      .where(eq(managerSettings.id, existing.id))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.MANAGER_STATUS,
      entityId: existing.id,
      oldValue: { section, workStatus: existing.workStatus },
      newValue: { section, workStatus: newStatus },
    });

    return updated;
  }

  async getActiveManagers(section: ManagerSection) {
    return this.db
      .select()
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, section),
          eq(managerSettings.workStatus, WorkStatus.WORKING),
        ),
      );
  }
}
