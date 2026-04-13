import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { managerSettings } from "@taxibrat/db";
import { ManagerSection, WorkStatus } from "@taxibrat/shared";

@Injectable()
export class ManagersService {
  constructor(@Inject("DATABASE") private db: Database) {}

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
