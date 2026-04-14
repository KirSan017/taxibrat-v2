import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users, notifications } from "@taxibrat/db";
import {
  UserStatus,
  POINTS,
  UpdateProfileDto,
  ListUsersDto,
  NotificationType,
  PointsTransactionType,
} from "@taxibrat/shared";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class UsersService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private pointsService: PointsService,
    private settingsService: SettingsService,
  ) {}

  async getById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.getById(userId);

    if (user.status === "BANNED") {
      throw new BadRequestException("Account is banned");
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...dto,
        status: UserStatus.PENDING_REVIEW,
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async approveUser(userId: string) {
    const user = await this.getById(userId);
    if (user.status !== UserStatus.PENDING_REVIEW) {
      throw new BadRequestException("User is not pending review");
    }

    const isFirstApproval = user.friendshipPoints === 0;

    const [updated] = await this.db
      .update(users)
      .set({
        status: UserStatus.ACTIVE,
        rejectionReason: null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (isFirstApproval) {
      const bonus = await this.settingsService.getNumber("points_registration", 100);
      await this.pointsService.award(userId, bonus, PointsTransactionType.REGISTRATION, "Регистрация + заполнение профиля");
    }

    await this.db.insert(notifications).values({
      userId,
      type: NotificationType.SYSTEM,
      title: "Профиль подтверждён",
      body: isFirstApproval
        ? "Ваш профиль подтверждён! Баллы дружбы начислены."
        : "Ваш профиль успешно обновлён.",
    });

    return updated;
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.getById(userId);
    if (user.status !== UserStatus.PENDING_REVIEW) {
      throw new BadRequestException("User is not pending review");
    }

    const [updated] = await this.db
      .update(users)
      .set({
        status: UserStatus.REJECTED,
        rejectionReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();

    await this.db.insert(notifications).values({
      userId,
      type: NotificationType.SYSTEM,
      title: "Профиль отклонён",
      body: `Причина: ${reason}. Исправьте данные и отправьте повторно.`,
    });

    return updated;
  }

  async listUsers(dto: ListUsersDto) {
    const conditions = [];
    if (dto.status) conditions.push(eq(users.status, dto.status));
    if (dto.role) conditions.push(eq(users.role, dto.role));
    if (dto.search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${dto.search}%`),
          ilike(users.lastName, `%${dto.search}%`),
          ilike(users.phone, `%${dto.search}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .limit(dto.limit)
        .offset((dto.page - 1) * dto.limit)
        .orderBy(users.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      page: dto.page,
      limit: dto.limit,
    };
  }

  async findDuplicatesByName(firstName: string, lastName: string, excludeId?: string) {
    const conditions = [
      ilike(users.firstName, firstName),
      ilike(users.lastName, lastName),
    ];
    if (excludeId) {
      conditions.push(sql`${users.id} != ${excludeId}`);
    }

    return this.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(and(...conditions));
  }
}
