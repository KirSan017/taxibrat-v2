import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { eq, and, asc, lt, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, ticketBuffer, managerSettings, users } from "@taxibrat/db";
import { TICKET_TOPIC_CONFIG, TicketTopic, NotificationType } from "@taxibrat/shared";
import { MessagesService } from "./messages.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import type Redis from "ioredis";

@Injectable()
export class TicketDistributorService {
  private readonly logger = new Logger(TicketDistributorService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    private messagesService: MessagesService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async assignTicket(ticketId: string, topic: TicketTopic, systemUserId: string): Promise<string | null> {
    const config = TICKET_TOPIC_CONFIG[topic];
    const section = config.section;
    const smOnly = (config as any).smOnly === true;

    // Get active managers for this section
    // BUYOUT topic: only SUPER_MANAGER/ADMIN can take these tickets
    const activeManagers = smOnly
      ? await this.db
          .select({ userId: managerSettings.userId })
          .from(managerSettings)
          .innerJoin(users, eq(users.id, managerSettings.userId))
          .where(
            and(
              eq(managerSettings.section, section as any),
              eq(managerSettings.workStatus, "WORKING"),
              // role check: SUPER_MANAGER or ADMIN
              // drizzle: use `or` via raw sql for enum compare
            ),
          )
          .then((rows) => rows)
      : await this.db
          .select({ userId: managerSettings.userId })
          .from(managerSettings)
          .where(
            and(
              eq(managerSettings.section, section as any),
              eq(managerSettings.workStatus, "WORKING"),
            ),
          );

    // If smOnly, filter by role (SUPER_MANAGER or ADMIN)
    let filteredManagers = activeManagers;
    if (smOnly && activeManagers.length > 0) {
      const ids = activeManagers.map((m) => m.userId);
      const allowedRoles = await this.db
        .select({ id: users.id, role: users.role })
        .from(users);
      const allowedSet = new Set(
        allowedRoles
          .filter((u) => ids.includes(u.id) && (u.role === "SUPER_MANAGER" || u.role === "ADMIN"))
          .map((u) => u.id),
      );
      filteredManagers = activeManagers.filter((m) => allowedSet.has(m.userId));
    }
    // Reassign the variable used below
    const managersForAssign = filteredManagers;

    if (managersForAssign.length === 0) {
      // No active managers — put in buffer
      await this.db.insert(ticketBuffer).values({
        ticketId,
        section: section as any,
      });

      await this.messagesService.createSystem(
        ticketId,
        systemUserId,
        "Все менеджеры сейчас недоступны. Ваш запрос в очереди.",
      );

      this.logger.log(`Ticket ${ticketId} buffered for section ${section}`);
      return null;
    }

    // Round-robin assignment
    const counter = await this.redis.incr(`round_robin:${section}`);
    const index = (counter - 1) % managersForAssign.length;
    const assignedToId = managersForAssign[index].userId;

    await this.db
      .update(tickets)
      .set({ assignedToId })
      .where(eq(tickets.id, ticketId));

    // Get manager name for system message
    const [manager] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, assignedToId))
      .limit(1);

    const managerName = manager?.firstName && manager?.lastName
      ? `${manager.firstName} ${manager.lastName.charAt(0)}.`
      : "менеджера";

    await this.messagesService.createSystem(
      ticketId,
      systemUserId,
      `Тикет назначен на менеджера ${managerName}`,
    );

    // Notify manager
    await this.notificationsService.create({
      userId: assignedToId,
      type: NotificationType.TICKET,
      title: "Новый тикет",
      body: "Вам назначен новый тикет",
      link: `/admin/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(assignedToId, {
      type: "new-ticket",
      ticketId,
    });

    this.logger.log(`Ticket ${ticketId} assigned to ${assignedToId}`);
    return assignedToId;
  }

  @Cron("*/15 * * * *")
  async drainBuffer() {
    const sections = ["CHAT", "TAXI_CHECK", "NO_9_PERCENT", "USERS", "BUYOUT"];

    for (const section of sections) {
      const activeManagers = await this.db
        .select({ userId: managerSettings.userId })
        .from(managerSettings)
        .where(
          and(
            eq(managerSettings.section, section as any),
            eq(managerSettings.workStatus, "WORKING"),
          ),
        );

      if (activeManagers.length === 0) continue;

      // Get oldest buffered ticket for this section
      const [buffered] = await this.db
        .select()
        .from(ticketBuffer)
        .where(eq(ticketBuffer.section, section as any))
        .orderBy(asc(ticketBuffer.createdAt))
        .limit(1);

      if (!buffered) continue;

      // Round-robin assignment
      const counter = await this.redis.incr(`round_robin:${section}`);
      const index = (counter - 1) % activeManagers.length;
      const assignedToId = activeManagers[index].userId;

      // Update ticket
      await this.db
        .update(tickets)
        .set({ assignedToId })
        .where(eq(tickets.id, buffered.ticketId));

      // Remove from buffer
      await this.db
        .delete(ticketBuffer)
        .where(eq(ticketBuffer.id, buffered.id));

      // Get manager name
      const [manager] = await this.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, assignedToId))
        .limit(1);

      const managerName = manager?.firstName && manager?.lastName
        ? `${manager.firstName} ${manager.lastName.charAt(0)}.`
        : "менеджера";

      // Get ticket creator for system user id
      const [ticket] = await this.db
        .select({ userId: tickets.userId })
        .from(tickets)
        .where(eq(tickets.id, buffered.ticketId))
        .limit(1);

      if (ticket) {
        await this.messagesService.createSystem(
          buffered.ticketId,
          ticket.userId,
          `Тикет назначен на менеджера ${managerName}`,
        );
      }

      // Notify manager
      await this.notificationsService.create({
        userId: assignedToId,
        type: NotificationType.TICKET,
        title: "Тикет из очереди",
        body: "Вам назначен тикет из буфера",
        link: `/admin/tickets/${buffered.ticketId}`,
      });
      this.notificationsGateway.pushToUser(assignedToId, {
        type: "new-ticket",
        ticketId: buffered.ticketId,
      });

      this.logger.log(`Buffer: ticket ${buffered.ticketId} assigned to ${assignedToId}`);
    }
  }

  /**
   * Archive SM_REJECTED tickets that have been in that state for more than 7 days.
   * Runs daily at midnight.
   */
  @Cron("0 0 * * *")
  async archiveStaleRejected() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);
    const result = await this.db
      .update(tickets)
      .set({
        status: "COMPLETED" as any,
        smRejectionReason: sql`COALESCE(${tickets.smRejectionReason}, 'Архивировано автоматически через 7 дней')`,
      })
      .where(
        and(
          eq(tickets.status, "SM_REJECTED" as any),
          lt(tickets.updatedAt, sevenDaysAgo),
        ),
      )
      .returning({ id: tickets.id });
    if (result.length > 0) {
      this.logger.log(`Auto-archived ${result.length} stale SM_REJECTED tickets`);
    }
  }
}
