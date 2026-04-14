import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, users } from "@taxibrat/db";
import {
  CreateTicketDto, ListTicketsDto, TicketStatus, TicketTopic,
  TICKET_TOPIC_CONFIG, NotificationType, PointsTransactionType,
} from "@taxibrat/shared";
import { TicketDistributorService } from "./ticket-distributor.service";
import { MessagesService } from "./messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class TicketsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private distributor: TicketDistributorService,
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private pointsService: PointsService,
    private settingsService: SettingsService,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    // Build auto-generated title
    const [user] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = user?.lastName && user?.firstName
      ? `${user.lastName} ${user.firstName}`
      : "Пользователь";

    const title = this.generateTitle(dto.topic, userName);

    const [ticket] = await this.db
      .insert(tickets)
      .values({
        userId,
        topic: dto.topic,
        title,
        relatedEntityType: dto.relatedEntityType as any,
        relatedEntityId: dto.relatedEntityId,
      })
      .returning();

    // Create first message from user
    await this.messagesService.create(ticket.id, userId, dto.body);

    // Charge points for paid topics
    if (dto.topic === "USER_BASE_CHECK") {
      const cost = await this.settingsService.getNumber("points_base_check_cost", 50);
      await this.pointsService.charge(userId, cost, PointsTransactionType.BASE_CHECK, "Проверка по базе таксопарков");
    }

    // Distribute to manager
    await this.distributor.assignTicket(ticket.id, dto.topic as TicketTopic, userId);

    return ticket;
  }

  async getById(id: string) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async listForUser(userId: string, dto: ListTicketsDto) {
    const conditions = [eq(tickets.userId, userId)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));
    if (dto.status) conditions.push(eq(tickets.status, dto.status as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listForManager(managerId: string, dto: ListTicketsDto) {
    const conditions = [eq(tickets.assignedToId, managerId)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));
    if (dto.status) conditions.push(eq(tickets.status, dto.status as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listForSmReview(dto: ListTicketsDto) {
    const conditions = [eq(tickets.status, "PENDING_SM_REVIEW" as any)];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async cancel(ticketId: string, userId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.userId !== userId) throw new ForbiddenException("Not your ticket");
    if (ticket.status !== "NEW") throw new BadRequestException("Can only cancel NEW tickets");

    await this.db.update(tickets)
      .set({ status: "CANCELLED" as any })
      .where(eq(tickets.id, ticketId));

    return { success: true };
  }

  async markInProgress(ticketId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.status === "NEW" || ticket.status === "SM_REJECTED") {
      await this.db.update(tickets)
        .set({ status: "IN_PROGRESS" as any })
        .where(eq(tickets.id, ticketId));
    }
  }

  async close(ticketId: string, managerId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.assignedToId !== managerId) throw new ForbiddenException("Not your ticket");
    if (ticket.status !== "IN_PROGRESS" && ticket.status !== "SM_REJECTED") {
      throw new BadRequestException("Ticket must be IN_PROGRESS or SM_REJECTED to close");
    }

    const config = TICKET_TOPIC_CONFIG[ticket.topic];
    const newStatus = config.smReviewRequired ? "PENDING_SM_REVIEW" : "COMPLETED";

    await this.db.update(tickets)
      .set({ status: newStatus as any })
      .where(eq(tickets.id, ticketId));

    if (newStatus === "PENDING_SM_REVIEW") {
      await this.messagesService.createSystem(
        ticketId, managerId,
        "Менеджер закрыл тикет. Ожидание проверки.",
      );
    }

    // Notify user
    await this.notificationsService.create({
      userId: ticket.userId,
      type: NotificationType.TICKET,
      title: newStatus === "COMPLETED" ? "Тикет завершён" : "Тикет на проверке",
      body: newStatus === "COMPLETED" ? "Ваш вопрос решён." : "Тикет отправлен на проверку.",
      link: `/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(ticket.userId, { type: "ticket-updated", ticketId, status: newStatus });

    return { success: true, status: newStatus };
  }

  async approve(ticketId: string, smId: string, pointsAwarded: number) {
    const ticket = await this.getById(ticketId);
    if (ticket.status !== "PENDING_SM_REVIEW") {
      throw new BadRequestException("Ticket must be PENDING_SM_REVIEW");
    }

    await this.db.update(tickets)
      .set({
        status: "COMPLETED" as any,
        smReviewedById: smId,
        pointsAwarded,
      })
      .where(eq(tickets.id, ticketId));

    // Award points to user
    if (pointsAwarded > 0) {
      await this.pointsService.award(
        ticket.userId,
        pointsAwarded,
        PointsTransactionType.PARK_CHECK,
        "Тикет подтверждён",
        ticketId,
        smId,
      );
    }

    const pointsMsg = pointsAwarded > 0 ? ` Начислено ${pointsAwarded} баллов дружбы.` : "";
    await this.messagesService.createSystem(
      ticketId, smId,
      `Тикет подтверждён.${pointsMsg}`,
    );

    await this.notificationsService.create({
      userId: ticket.userId,
      type: NotificationType.TICKET,
      title: "Тикет подтверждён",
      body: `Ваш тикет подтверждён.${pointsMsg}`,
      link: `/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(ticket.userId, { type: "ticket-updated", ticketId, status: "COMPLETED" });

    return { success: true };
  }

  async reject(ticketId: string, smId: string, reason: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.status !== "PENDING_SM_REVIEW") {
      throw new BadRequestException("Ticket must be PENDING_SM_REVIEW");
    }

    await this.db.update(tickets)
      .set({
        status: "SM_REJECTED" as any,
        smReviewedById: smId,
        smRejectionReason: reason,
      })
      .where(eq(tickets.id, ticketId));

    await this.messagesService.createSystem(
      ticketId, smId,
      `Тикет отклонён. Причина: ${reason}`,
    );

    // Notify assigned manager
    if (ticket.assignedToId) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        type: NotificationType.TICKET,
        title: "Тикет отклонён СМ",
        body: `Причина: ${reason}`,
        link: `/admin/tickets/${ticketId}`,
      });
      this.notificationsGateway.pushToUser(ticket.assignedToId, { type: "ticket-updated", ticketId, status: "SM_REJECTED" });
    }

    return { success: true };
  }

  private generateTitle(topic: string, userName: string): string {
    const titles: Record<string, string> = {
      PARK_CHECK: `Проверка Таксопарка`,
      USER_BASE_CHECK: `Проверка по БАЗЕ ${userName}`,
      TAXI_CONNECT: `${userName} Аренда`,
      BUYOUT: `ВЫКУП`,
      LEGAL: `Юридический вопрос ${userName}`,
      FRIENDSHIP_POINTS: `Баллы дружбы ${userName}`,
      OTHER: `Обращение ${userName}`,
    };
    return titles[topic] || `Тикет ${userName}`;
  }
}
