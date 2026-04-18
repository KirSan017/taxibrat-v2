import {
  Injectable, Inject, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from "@nestjs/common";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { no9Orders, users, managerSettings } from "@taxibrat/db";
import {
  CreateNo9OrderDto, ListNo9OrdersDto,
  PointsTransactionType, NotificationType,
} from "@taxibrat/shared";
import { OrdersDistributorService } from "./orders.distributor";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";

const CANCEL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    private distributor: OrdersDistributorService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private pointsService: PointsService,
    private settingsService: SettingsService,
  ) {}

  async create(userId: string, dto: CreateNo9OrderDto) {
    // Check feature enabled (effective = admin-on AND not auto-disabled)
    const enabled = await this.settingsService.getBoolean("no9_enabled");
    const autoDisabled = await this.settingsService.getBoolean("no9_auto_disabled");
    if (!enabled || autoDisabled) {
      throw new BadRequestException("Функция временно недоступна. Попробуйте через 20 минут.");
    }

    // Check user has full profile (ACTIVE status)
    const [user] = await this.db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.status !== "ACTIVE") {
      throw new BadRequestException("Заполните профиль для использования этой функции");
    }

    // Charge points
    const cost = await this.settingsService.getNumber("points_order_no9_cost", 50);
    await this.pointsService.charge(userId, cost, PointsTransactionType.ORDER_NO9, "Заказ «По делам, без 9%»");

    // Find a manager
    const managerId = await this.distributor.pickManager();
    if (!managerId) {
      // Refund points since no manager available
      await this.pointsService.award(userId, cost, PointsTransactionType.ORDER_NO9, "Возврат — нет доступных менеджеров");
      throw new BadRequestException("Функция временно недоступна. Попробуйте через 20 минут.");
    }

    // Create order
    const [order] = await this.db
      .insert(no9Orders)
      .values({
        userId,
        assignedToId: managerId,
        pointFrom: dto.pointFrom,
        pointTo: dto.pointTo,
        assignedAt: new Date(),
      })
      .returning();

    // Notify manager
    await this.notificationsService.create({
      userId: managerId,
      type: NotificationType.SYSTEM,
      title: "Новый заказ «Без 9%»",
      body: `${dto.pointFrom} → ${dto.pointTo}`,
      link: `/admin/orders/no9/${order.id}`,
    });
    this.notificationsGateway.pushToUser(managerId, {
      type: "new-no9-order",
      orderId: order.id,
    });

    this.logger.log(`Order ${order.id} created by ${userId}, assigned to ${managerId}`);
    return order;
  }

  async cancel(orderId: string, userId: string) {
    const order = await this.getById(orderId);

    if (order.userId !== userId) {
      throw new ForbiddenException("Это не ваш заказ");
    }
    if (order.status !== "PENDING") {
      throw new BadRequestException("Можно отменить только заказ в статусе PENDING");
    }

    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      throw new BadRequestException("Отмена возможна только в течение 10 минут после создания");
    }

    // Charge cancellation fee immediately
    const cancelCost = await this.settingsService.getNumber("points_order_cancel_cost", 15);
    await this.pointsService.charge(userId, cancelCost, PointsTransactionType.ORDER_CANCEL, "Запрос на отмену заказа «По делам, без 9%»");

    // Set CANCEL_REQUESTED (not CANCELLED). Final cancel must be confirmed by manager.
    await this.db
      .update(no9Orders)
      .set({ status: "CANCEL_REQUESTED" as any })
      .where(eq(no9Orders.id, orderId));

    // Notify assigned manager
    if (order.assignedToId) {
      await this.notificationsService.create({
        userId: order.assignedToId,
        type: NotificationType.SYSTEM,
        title: "Запрос на отмену заказа",
        body: `Пользователь просит отменить заказ ${order.pointFrom} → ${order.pointTo}. Подтвердите отмену.`,
        link: `/admin/orders/no9/${orderId}`,
      });
      this.notificationsGateway.pushToUser(order.assignedToId, {
        type: "no9-order-cancel-requested",
        orderId,
      });
    }

    this.logger.log(`Order ${orderId} cancel requested by user ${userId}`);
    return { success: true, status: "CANCEL_REQUESTED" };
  }

  async confirmCancel(orderId: string, managerId: string) {
    const order = await this.getById(orderId);
    this.assertManagerOwns(order, managerId);
    if (order.status !== "CANCEL_REQUESTED") {
      throw new BadRequestException("Заказ не в статусе CANCEL_REQUESTED");
    }

    await this.db
      .update(no9Orders)
      .set({
        status: "CANCELLED" as any,
        completedAt: new Date(),
      })
      .where(eq(no9Orders.id, orderId));

    await this.notificationsService.create({
      userId: order.userId,
      type: NotificationType.SYSTEM,
      title: "Заказ отменён",
      body: `Ваш заказ ${order.pointFrom} → ${order.pointTo} отменён менеджером.`,
      link: `/orders/no9/${orderId}`,
    });
    this.notificationsGateway.pushToUser(order.userId, {
      type: "no9-order-updated",
      orderId,
      status: "CANCELLED",
    });

    await this.tryResetManagerFiveMinCount(managerId);

    this.logger.log(`Order ${orderId} cancel confirmed by ${managerId}`);
    return { success: true };
  }

  async markOrdered(orderId: string, managerId: string) {
    const order = await this.getById(orderId);
    this.assertManagerOwns(order, managerId);
    this.assertPending(order);

    await this.db
      .update(no9Orders)
      .set({
        status: "ORDERED" as any,
        completedAt: new Date(),
      })
      .where(eq(no9Orders.id, orderId));

    // Notify user
    await this.notificationsService.create({
      userId: order.userId,
      type: NotificationType.SYSTEM,
      title: "Такси заказано",
      body: `Ваш заказ ${order.pointFrom} → ${order.pointTo} выполнен.`,
      link: `/orders/no9/${orderId}`,
    });
    this.notificationsGateway.pushToUser(order.userId, {
      type: "no9-order-updated",
      orderId,
      status: "ORDERED",
    });

    // Check if manager has no unclosed orders → reset fiveMinCount
    await this.tryResetManagerFiveMinCount(managerId);

    this.logger.log(`Order ${orderId} marked ORDERED by ${managerId}`);
    return { success: true };
  }

  async markBanned(orderId: string, managerId: string) {
    const order = await this.getById(orderId);
    this.assertManagerOwns(order, managerId);
    this.assertPending(order);

    await this.db
      .update(no9Orders)
      .set({
        status: "BANNED" as any,
        completedAt: new Date(),
      })
      .where(eq(no9Orders.id, orderId));

    // Notify user (shadow ban — masked as if processed normally)
    await this.notificationsService.create({
      userId: order.userId,
      type: NotificationType.SYSTEM,
      title: "Ваш заказ обработан, ожидайте",
      body: `Ваш заказ ${order.pointFrom} → ${order.pointTo} обработан, ожидайте.`,
      link: `/orders/no9/${orderId}`,
    });
    // Push mask: tell client "ORDERED" so nothing betrays ban
    this.notificationsGateway.pushToUser(order.userId, {
      type: "no9-order-updated",
      orderId,
      status: "ORDERED",
    });

    // Check if manager has no unclosed orders → reset fiveMinCount
    await this.tryResetManagerFiveMinCount(managerId);

    this.logger.log(`Order ${orderId} marked BANNED by ${managerId}`);
    return { success: true };
  }

  async fiveMin(orderId: string, managerId: string) {
    const order = await this.getById(orderId);
    this.assertManagerOwns(order, managerId);
    this.assertPending(order);

    // 1. Increment order fiveMinCount
    await this.db
      .update(no9Orders)
      .set({
        fiveMinCount: sql`${no9Orders.fiveMinCount} + 1`,
      })
      .where(eq(no9Orders.id, orderId));

    // 2. Increment manager_settings fiveMinCount
    await this.db
      .update(managerSettings)
      .set({
        fiveMinCount: sql`${managerSettings.fiveMinCount} + 1`,
      })
      .where(
        and(
          eq(managerSettings.userId, managerId),
          eq(managerSettings.section, "NO_9_PERCENT" as any),
        ),
      );

    // 3. Notify user
    await this.notificationsService.create({
      userId: order.userId,
      type: NotificationType.SYSTEM,
      title: "Подождите 5 минут",
      body: `По вашему заказу ${order.pointFrom} → ${order.pointTo}: подождите 5 минут.`,
      link: `/orders/no9/${orderId}`,
    });
    this.notificationsGateway.pushToUser(order.userId, {
      type: "no9-order-five-min",
      orderId,
    });

    // 4. Check auto-block: if manager fiveMinCount >= 3, check all managers
    const [managerSetting] = await this.db
      .select({ fiveMinCount: managerSettings.fiveMinCount })
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.userId, managerId),
          eq(managerSettings.section, "NO_9_PERCENT" as any),
        ),
      )
      .limit(1);

    if (managerSetting && managerSetting.fiveMinCount >= 3) {
      this.logger.warn(`Manager ${managerId} auto-blocked (fiveMinCount >= 3)`);

      // Check if ALL managers in NO_9_PERCENT are blocked
      const availableManagers = await this.distributor.pickManager();
      if (!availableManagers) {
        // All managers blocked — auto-disable feature (keep admin flag intact)
        await this.settingsService.set("no9_auto_disabled", "true");
        this.logger.warn("All NO_9_PERCENT managers blocked — feature auto-disabled");
      }
    }

    this.logger.log(`Order ${orderId}: 5-min by ${managerId}`);
    return { success: true };
  }

  async listForUser(userId: string, dto: ListNo9OrdersDto) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(no9Orders)
        .where(eq(no9Orders.userId, userId))
        .orderBy(desc(no9Orders.createdAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(no9Orders)
        .where(eq(no9Orders.userId, userId)),
    ]);

    // Shadow-ban masking: BANNED looks like ORDERED to the user
    const masked = data.map((o: any) => ({
      ...o,
      status: o.status === "BANNED" ? "ORDERED" : o.status,
    }));

    return { data: masked, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async listForManager(managerId: string, dto: ListNo9OrdersDto) {
    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(no9Orders)
        .where(eq(no9Orders.assignedToId, managerId))
        .orderBy(desc(no9Orders.createdAt))
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(no9Orders)
        .where(eq(no9Orders.assignedToId, managerId)),
    ]);

    return { data, total: Number(countResult[0].count), page: dto.page, limit: dto.limit };
  }

  async getFeatureStatus() {
    const adminEnabled = await this.settingsService.getBoolean("no9_enabled");
    const autoDisabled = await this.settingsService.getBoolean("no9_auto_disabled");
    const enabled = adminEnabled && !autoDisabled;

    // Count managers with fiveMinCount >= 3
    const [blockedResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(managerSettings)
      .where(
        and(
          eq(managerSettings.section, "NO_9_PERCENT" as any),
          sql`${managerSettings.fiveMinCount} >= 3`,
        ),
      );

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(managerSettings)
      .where(eq(managerSettings.section, "NO_9_PERCENT" as any));

    return {
      enabled,
      adminEnabled,
      autoDisabled,
      blockedManagers: Number(blockedResult.count),
      totalManagers: Number(totalResult.count),
    };
  }

  // --- Helpers ---

  private async getById(id: string) {
    const [order] = await this.db
      .select()
      .from(no9Orders)
      .where(eq(no9Orders.id, id))
      .limit(1);

    if (!order) throw new NotFoundException("Заказ не найден");
    return order;
  }

  private assertManagerOwns(order: any, managerId: string) {
    if (order.assignedToId !== managerId) {
      throw new ForbiddenException("Заказ назначен другому менеджеру");
    }
  }

  private assertPending(order: any) {
    if (order.status !== "PENDING") {
      throw new BadRequestException("Заказ не в статусе PENDING");
    }
  }

  private async tryResetManagerFiveMinCount(managerId: string) {
    // Check if manager has 0 unclosed (PENDING) orders
    const [unclosed] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(no9Orders)
      .where(
        and(
          eq(no9Orders.assignedToId, managerId),
          eq(no9Orders.status, "PENDING" as any),
        ),
      );

    if (Number(unclosed.count) === 0) {
      await this.db
        .update(managerSettings)
        .set({ fiveMinCount: 0 })
        .where(
          and(
            eq(managerSettings.userId, managerId),
            eq(managerSettings.section, "NO_9_PERCENT" as any),
          ),
        );

      // Re-enable feature only if it was auto-disabled (do not touch admin flag)
      const autoDisabled = await this.settingsService.getBoolean("no9_auto_disabled");
      if (autoDisabled) {
        await this.settingsService.set("no9_auto_disabled", "false");
        this.logger.log("NO_9_PERCENT auto-disabled flag cleared (manager cleared queue)");
      }

      this.logger.log(`Manager ${managerId} fiveMinCount reset to 0`);
    }
  }
}
