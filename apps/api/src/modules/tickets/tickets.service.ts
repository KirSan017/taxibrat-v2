import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  tickets, users, buyoutListings, carBrands, carModels,
  parkClasses, taxiParks,
} from "@taxibrat/db";
import {
  CreateTicketDto, ListTicketsDto, TicketStatus, TicketTopic,
  TICKET_TOPIC_CONFIG, NotificationType, PointsTransactionType,
  AuditAction, AuditEntity,
} from "@taxibrat/shared";

// SLA hours per ticket topic. Overdue tickets are sorted to the top in manager queue.
const SLA_HOURS: Record<string, number> = {
  PARK_CHECK: 48,
  PARK_ADD: 48,
  USER_BASE_CHECK: 24,
  TAXI_CONNECT: 24,
  BUYOUT: 72,
  LEGAL: 48,
  FRIENDSHIP_POINTS: 24,
  IDEA: 168, // week
  OTHER: 48,
};

function isTicketOverdue(ticket: { topic: string; createdAt: Date | string; status: string }): boolean {
  // Closed/cancelled/completed tickets are never overdue
  if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED" || ticket.status === "PENDING_SM_REVIEW") {
    return false;
  }
  const sla = SLA_HOURS[ticket.topic] ?? 48;
  const created = new Date(ticket.createdAt).getTime();
  return created + sla * 3600_000 < Date.now();
}
import { TicketDistributorService } from "./ticket-distributor.service";
import { MessagesService } from "./messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";
import { ReferralsService } from "../referrals/referrals.service";
import { AuditService } from "../audit/audit.service";

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
    private referralsService: ReferralsService,
    private auditService: AuditService,
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

    const title = await this.generateTitle(
      dto.topic,
      userName,
      dto.relatedEntityId,
      dto.titleHint,
    );

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

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.TICKET,
      entityId: ticket.id,
      newValue: ticket,
    });

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

    // Fetch a wide window, then sort in JS: overdue first, then createdAt ASC
    const [rawData, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(and(...conditions))
        .orderBy(tickets.createdAt),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions)),
    ]);

    const annotated = rawData.map((t) => ({
      ...t,
      isOverdue: isTicketOverdue(t),
    }));

    annotated.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Paginate in memory
    const start = (dto.page - 1) * dto.limit;
    const data = annotated.slice(start, start + dto.limit);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listAll(dto: ListTicketsDto) {
    const conditions: any[] = [];
    if (dto.topic) conditions.push(eq(tickets.topic, dto.topic as any));
    if (dto.status) conditions.push(eq(tickets.status, dto.status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.select().from(tickets)
        .where(where)
        .orderBy(desc(tickets.updatedAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(where),
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

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      oldValue: { status: ticket.status },
      newValue: { status: "CANCELLED" },
    });

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

    await this.auditService.log({
      actorId: managerId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      oldValue: { status: ticket.status },
      newValue: { status: newStatus },
    });

    return { success: true, status: newStatus };
  }

  /**
   * Map ticket topic to corresponding points transaction type + settings key.
   * Topics that should not award points (USER_BASE_CHECK, LEGAL, FRIENDSHIP_POINTS, OTHER) return null.
   */
  private getPointsConfigForTopic(
    topic: string,
  ): { type: PointsTransactionType; settingsKey: string; defaultAmount: number } | null {
    switch (topic) {
      case "PARK_CHECK":
        return { type: PointsTransactionType.PARK_CHECK, settingsKey: "points_park_check", defaultAmount: 150 };
      case "PARK_ADD":
        return { type: PointsTransactionType.PARK_CHECK, settingsKey: "points_park_add", defaultAmount: 200 };
      case "TAXI_CONNECT":
        return { type: PointsTransactionType.TAXI_CONNECT, settingsKey: "points_taxi_connect", defaultAmount: 150 };
      case "BUYOUT":
        return { type: PointsTransactionType.BUYOUT, settingsKey: "points_buyout", defaultAmount: 1000 };
      case "IDEA":
        return { type: PointsTransactionType.IDEA, settingsKey: "points_idea", defaultAmount: 50 };
      default:
        // USER_BASE_CHECK (already charged), LEGAL, FRIENDSHIP_POINTS, OTHER — no points awarded
        return null;
    }
  }

  async approve(ticketId: string, smId: string, pointsAwardedOverride?: number) {
    const ticket = await this.getById(ticketId);
    if (ticket.status !== "PENDING_SM_REVIEW") {
      throw new BadRequestException("Ticket must be PENDING_SM_REVIEW");
    }

    // Resolve points amount + type based on topic
    const topicConfig = this.getPointsConfigForTopic(ticket.topic);
    let pointsAwarded = 0;
    let pointsType: PointsTransactionType | null = null;

    if (topicConfig) {
      pointsType = topicConfig.type;
      // Prefer explicit override from SM if provided, otherwise use settings value
      if (typeof pointsAwardedOverride === "number" && pointsAwardedOverride >= 0) {
        pointsAwarded = pointsAwardedOverride;
      } else {
        pointsAwarded = await this.settingsService.getNumber(
          topicConfig.settingsKey,
          topicConfig.defaultAmount,
        );
      }
    }

    await this.db.update(tickets)
      .set({
        status: "COMPLETED" as any,
        smReviewedById: smId,
        pointsAwarded,
      })
      .where(eq(tickets.id, ticketId));

    // Award points to user only if topic supports points and amount > 0
    if (pointsType && pointsAwarded > 0) {
      await this.pointsService.award(
        ticket.userId,
        pointsAwarded,
        pointsType,
        "Тикет подтверждён",
        ticketId,
        smId,
      );
    }

    // Increment successful park checks counter for honor board
    if (ticket.topic === "PARK_CHECK" || ticket.topic === "PARK_ADD") {
      await this.db
        .update(users)
        .set({ successfulParkChecks: sql`${users.successfulParkChecks} + 1` })
        .where(eq(users.id, ticket.userId));
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

    // Award referral bonuses for rental/buyout tickets
    if (ticket.topic === "TAXI_CONNECT") {
      await this.referralsService.awardRentalBonus(ticket.userId, ticketId);
    } else if (ticket.topic === "BUYOUT") {
      await this.referralsService.awardBuyoutBonus(ticket.userId, ticketId);
    }

    await this.auditService.log({
      actorId: smId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      oldValue: { status: ticket.status },
      newValue: { status: "COMPLETED", pointsAwarded, pointsType },
    });

    return { success: true };
  }

  /**
   * Confirm actual rental for a TAXI_CONNECT ticket (ТЗ 632-633 — "взяли в аренду такси").
   * Only works on COMPLETED TAXI_CONNECT tickets that haven't been confirmed yet.
   * Awards `points_rental_confirmed` (default 300) separately from the TAXI_CONNECT
   * approval bonus (150). Idempotent: rentalConfirmedAt prevents double-awarding.
   */
  async confirmRental(ticketId: string, actorId: string) {
    const ticket = await this.getById(ticketId);
    if (ticket.topic !== "TAXI_CONNECT") {
      throw new BadRequestException("Факт аренды можно подтвердить только для тикетов TAXI_CONNECT");
    }
    if (ticket.status !== "COMPLETED") {
      throw new BadRequestException("Тикет должен быть в статусе COMPLETED");
    }
    if ((ticket as any).rentalConfirmedAt) {
      throw new BadRequestException("Факт аренды уже подтверждён ранее");
    }

    const bonus = await this.settingsService.getNumber("points_rental_confirmed", 300);
    const now = new Date();

    await this.db
      .update(tickets)
      .set({
        rentalConfirmedAt: now,
        rentalConfirmedById: actorId,
      } as any)
      .where(eq(tickets.id, ticketId));

    if (bonus > 0) {
      await this.pointsService.award(
        ticket.userId,
        bonus,
        PointsTransactionType.RENTAL_CONFIRMED,
        "Подтверждён факт аренды такси",
        ticketId,
        actorId,
      );
    }

    await this.messagesService.createSystem(
      ticketId,
      actorId,
      `Факт аренды подтверждён. Начислено ${bonus} баллов дружбы.`,
    );

    await this.notificationsService.create({
      userId: ticket.userId,
      type: NotificationType.TICKET,
      title: "Факт аренды подтверждён",
      body: `Начислено ${bonus} баллов дружбы за подтверждённую аренду.`,
      link: `/tickets/${ticketId}`,
    });
    this.notificationsGateway.pushToUser(ticket.userId, {
      type: "ticket-updated",
      ticketId,
      status: "COMPLETED",
    });

    await this.auditService.log({
      actorId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      oldValue: { rentalConfirmedAt: null },
      newValue: { rentalConfirmedAt: now.toISOString(), pointsAwarded: bonus },
    });

    return { success: true, pointsAwarded: bonus };
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

    await this.auditService.log({
      actorId: smId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      oldValue: { status: ticket.status },
      newValue: { status: "SM_REJECTED", rejectionReason: reason },
    });

    return { success: true };
  }

  private async generateTitle(
    topic: string,
    userName: string,
    relatedEntityId?: string,
    titleHint?: string,
  ): Promise<string> {
    // PARK_CHECK: if form supplied a park name hint, include it
    if (topic === "PARK_CHECK" && titleHint && titleHint.trim()) {
      return `Проверка Таксопарка ${titleHint.trim()}`.slice(0, 200);
    }
    // PARK_ADD: if form supplied a park name hint, include it
    if (topic === "PARK_ADD" && titleHint && titleHint.trim()) {
      return `Добавление Таксопарка ${titleHint.trim()}`.slice(0, 200);
    }
    // BUYOUT: include brand/model/year fetched from related listing
    if (topic === "BUYOUT" && relatedEntityId) {
      try {
        const [listing] = await this.db
          .select({
            brandId: buyoutListings.brandId,
            modelId: buyoutListings.modelId,
            year: buyoutListings.year,
          })
          .from(buyoutListings)
          .where(eq(buyoutListings.id, relatedEntityId))
          .limit(1);
        if (listing) {
          const [brand] = await this.db
            .select({ name: carBrands.name })
            .from(carBrands)
            .where(eq(carBrands.id, listing.brandId))
            .limit(1);
          const [model] = await this.db
            .select({ name: carModels.name })
            .from(carModels)
            .where(eq(carModels.id, listing.modelId))
            .limit(1);
          const brandName = brand?.name ?? "";
          const modelName = model?.name ?? "";
          return `ВЫКУП ${brandName} ${modelName} ${listing.year}г`.trim().replace(/\s+/g, " ");
        }
      } catch {
        // fall through to default title
      }
    }

    // TAXI_CONNECT: include park name and class
    if (topic === "TAXI_CONNECT" && relatedEntityId) {
      try {
        const [cls] = await this.db
          .select({
            parkId: parkClasses.parkId,
            driverClass: parkClasses.driverClass,
          })
          .from(parkClasses)
          .where(eq(parkClasses.id, relatedEntityId))
          .limit(1);
        if (cls) {
          const [park] = await this.db
            .select({ name: taxiParks.name })
            .from(taxiParks)
            .where(eq(taxiParks.id, cls.parkId))
            .limit(1);
          if (park) {
            const classLabel = DRIVER_CLASS_LABELS_RU[cls.driverClass] ?? cls.driverClass;
            return `${userName} Аренда в ${park.name} ${classLabel}`;
          }
        }
      } catch {
        // fall through to default title
      }
    }

    const titles: Record<string, string> = {
      PARK_CHECK: `Проверка Таксопарка`,
      PARK_ADD: `Добавление Таксопарка`,
      USER_BASE_CHECK: `Проверка по БАЗЕ ${userName}`,
      TAXI_CONNECT: `${userName} Аренда`,
      BUYOUT: `ВЫКУП`,
      LEGAL: `Юридический вопрос ${userName}`,
      FRIENDSHIP_POINTS: `Баллы дружбы ${userName}`,
      IDEA: `Идея от ${userName}`,
      OTHER: `Обращение ${userName}`,
    };
    return titles[topic] || `Тикет ${userName}`;
  }
}

const DRIVER_CLASS_LABELS_RU: Record<string, string> = {
  ECONOMY: "Эконом",
  COMFORT: "Комфорт",
  COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес",
  PREMIER: "Премьер",
  ELITE: "Элит",
};
