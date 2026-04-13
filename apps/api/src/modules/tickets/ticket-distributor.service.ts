import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { eq, and, asc } from "drizzle-orm";
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

    // Get active managers for this section
    const activeManagers = await this.db
      .select({ userId: managerSettings.userId })
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, section as any),
          eq(managerSettings.workStatus, "WORKING"),
        ),
      );

    if (activeManagers.length === 0) {
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
    const index = (counter - 1) % activeManagers.length;
    const assignedToId = activeManagers[index].userId;

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
}
