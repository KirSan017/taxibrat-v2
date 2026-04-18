import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, ilike, or, sql, gt } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users, notifications, verificationCodes } from "@taxibrat/db";
import {
  UserStatus,
  POINTS,
  UpdateProfileDto,
  ListUsersDto,
  NotificationType,
  PointsTransactionType,
  AuditAction,
  AuditEntity,
  UserRole,
  VerificationMethod,
  AUTH,
} from "@taxibrat/shared";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";
import { ReferralsService } from "../referrals/referrals.service";
import { AuditService } from "../audit/audit.service";
import { sign } from "jsonwebtoken";
import { ExolveProvider } from "../auth/providers/exolve.provider";
import { TelegramProvider } from "../auth/providers/telegram.provider";

type User = typeof users.$inferSelect;
type JwtPayload = { sub: string; phone: string; role: string; impersonatedBy?: string };

@Injectable()
export class UsersService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private pointsService: PointsService,
    private settingsService: SettingsService,
    private referralsService: ReferralsService,
    private auditService: AuditService,
    private config: ConfigService,
    @Inject("EXOLVE_PROVIDER") private exolve: ExolveProvider,
    @Inject("TELEGRAM_PROVIDER") private telegram: TelegramProvider,
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

  async getByIdMasked(id: string, viewer: JwtPayload) {
    const target = await this.getById(id);
    return this.maskUserFields(target, viewer);
  }

  async updatePhoto(userId: string, photoUrl: string | null) {
    await this.getById(userId);
    const [updated] = await this.db
      .update(users)
      .set({ photoUrl })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.getById(userId);

    if (user.status === "BANNED") {
      throw new BadRequestException("Account is banned");
    }

    let updated: typeof users.$inferSelect;
    try {
      [updated] = await this.db
        .update(users)
        .set({
          ...dto,
          status: UserStatus.PENDING_REVIEW,
        })
        .where(eq(users.id, userId))
        .returning();
    } catch (err: any) {
      const code = err?.code;
      const constraint = String(err?.constraint_name ?? err?.constraint ?? "");
      if (code === "23505" && constraint.includes("email")) {
        throw new ConflictException("Этот email уже используется другим пользователем");
      }
      throw err;
    }

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: user,
      newValue: updated,
    });

    return updated;
  }

  async approveUser(userId: string, actorId: string) {
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

      // Award referral registration bonus if user was invited
      await this.referralsService.awardRegistrationBonus(userId);
    }

    await this.db.insert(notifications).values({
      userId,
      type: NotificationType.SYSTEM,
      title: "Профиль подтверждён",
      body: isFirstApproval
        ? "Ваш профиль подтверждён! Баллы дружбы начислены."
        : "Ваш профиль успешно обновлён.",
    });

    await this.auditService.log({
      actorId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: { status: user.status },
      newValue: { status: UserStatus.ACTIVE },
    });

    return updated;
  }

  async rejectUser(userId: string, reason: string, actorId: string) {
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

    await this.auditService.log({
      actorId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: { status: user.status },
      newValue: { status: UserStatus.REJECTED, rejectionReason: reason },
    });

    return updated;
  }

  async listUsers(dto: ListUsersDto, viewer?: JwtPayload) {
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

    // Apply visibility masking if viewer provided
    let maskedData = data;
    if (viewer) {
      // Fetch viewer flags once for SM
      const viewerUser =
        viewer.role === UserRole.SUPER_MANAGER
          ? (await this.db.select().from(users).where(eq(users.id, viewer.sub)).limit(1))[0]
          : null;
      maskedData = data.map((u) => this.maskUserFieldsSync(u, viewer, viewerUser ?? null));
    }

    return {
      data: maskedData,
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

  /* ── Masking / visibility ────────────────────────── */

  private maskUserFieldsSync(target: User, viewer: JwtPayload, viewerUser: User | null): any {
    if (viewer.role === UserRole.ADMIN) return target;
    if (viewer.role === UserRole.MANAGER) {
      return {
        ...target,
        phone: null,
        email: null,
        birthDate: null,
        phoneHidden: true,
        emailHidden: true,
        birthDateHidden: true,
      };
    }
    if (viewer.role === UserRole.SUPER_MANAGER) {
      return {
        ...target,
        phone: viewerUser?.canViewUserPhone ? target.phone : null,
        email: viewerUser?.canViewUserEmail ? target.email : null,
        birthDate: viewerUser?.canViewUserBirthDate ? target.birthDate : null,
        phoneHidden: !viewerUser?.canViewUserPhone,
        emailHidden: !viewerUser?.canViewUserEmail,
        birthDateHidden: !viewerUser?.canViewUserBirthDate,
      };
    }
    return target;
  }

  async maskUserFields(target: User, viewer: JwtPayload) {
    if (viewer.role === UserRole.ADMIN) return target;
    let viewerUser: User | null = null;
    if (viewer.role === UserRole.SUPER_MANAGER) {
      const [row] = await this.db.select().from(users).where(eq(users.id, viewer.sub)).limit(1);
      viewerUser = row ?? null;
    }
    return this.maskUserFieldsSync(target, viewer, viewerUser);
  }

  /* ── Admin actions ────────────────────────── */

  async impersonate(adminId: string, targetUserId: string) {
    const [target] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw new NotFoundException("User not found");

    const payload = {
      sub: target.id,
      phone: target.phone,
      role: target.role,
      impersonatedBy: adminId,
    };

    const accessToken = sign(payload, this.config.get("JWT_SECRET")!, {
      expiresIn: "1h",
    });

    await this.auditService.log({
      actorId: adminId,
      action: AuditAction.STATUS_CHANGE,
      entity: AuditEntity.USER,
      entityId: targetUserId,
      newValue: { impersonatedBy: adminId, action: "impersonate" },
    });

    return {
      accessToken,
      user: {
        id: target.id,
        phone: target.phone,
        firstName: target.firstName,
        lastName: target.lastName,
        patronymic: target.patronymic,
        email: target.email,
        birthDate: target.birthDate,
        photoUrl: target.photoUrl,
        role: target.role,
        status: target.status,
        friendshipPoints: target.friendshipPoints,
        referralCode: target.referralCode,
        createdAt: target.createdAt?.toISOString?.() ?? target.createdAt,
      },
    };
  }

  async deleteUser(adminId: string, userId: string) {
    if (adminId === userId) {
      throw new BadRequestException("Нельзя удалить свой аккаунт");
    }
    const user = await this.getById(userId);

    await this.auditService.log({
      actorId: adminId,
      action: AuditAction.DELETE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName },
    });

    try {
      await this.db.delete(users).where(eq(users.id, userId));
    } catch (err) {
      // Hard-delete may fail due to FK constraints. Fall back to soft-ban.
      await this.db
        .update(users)
        .set({ status: UserStatus.BANNED, rejectionReason: "Удалён администратором" })
        .where(eq(users.id, userId));
    }
    return { success: true };
  }

  async updateVisibilityFlags(
    adminId: string,
    userId: string,
    dto: {
      canViewUserPhone?: boolean;
      canViewUserEmail?: boolean;
      canViewUserBirthDate?: boolean;
    },
  ) {
    const user = await this.getById(userId);
    if (user.role !== UserRole.SUPER_MANAGER) {
      throw new BadRequestException("Флаги видимости применимы только к SUPER_MANAGER");
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof dto.canViewUserPhone === "boolean") updates.canViewUserPhone = dto.canViewUserPhone;
    if (typeof dto.canViewUserEmail === "boolean") updates.canViewUserEmail = dto.canViewUserEmail;
    if (typeof dto.canViewUserBirthDate === "boolean") updates.canViewUserBirthDate = dto.canViewUserBirthDate;

    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: {
        canViewUserPhone: user.canViewUserPhone,
        canViewUserEmail: user.canViewUserEmail,
        canViewUserBirthDate: user.canViewUserBirthDate,
      },
      newValue: updates,
    });

    return updated;
  }

  /* ── Phone change flow ────────────────────────── */

  async requestPhoneChange(
    userId: string,
    newPhone: string,
    method: "SMS" | "TELEGRAM",
  ) {
    const me = await this.getById(userId);
    if (!newPhone || !/^\+?\d{10,15}$/.test(newPhone.replace(/\s/g, ""))) {
      throw new BadRequestException("Некорректный номер телефона");
    }
    if (newPhone === me.phone) {
      throw new BadRequestException("Это уже ваш текущий номер");
    }

    const [taken] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, newPhone))
      .limit(1);
    if (taken) {
      throw new BadRequestException("Этот номер уже используется");
    }

    await this.db.delete(verificationCodes).where(eq(verificationCodes.phone, newPhone));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + AUTH.CODE_TTL_MINUTES * 60 * 1000);

    await this.db.insert(verificationCodes).values({
      phone: newPhone,
      code,
      method: method === "SMS" ? VerificationMethod.SMS : VerificationMethod.TELEGRAM,
      expiresAt,
      attempts: 0,
    });

    const sent =
      method === "SMS"
        ? await this.exolve.sendSms(newPhone, code)
        : await this.telegram.sendCode(newPhone, code);

    if (!sent) {
      throw new BadRequestException("Не удалось отправить код");
    }
    return { codeSent: true };
  }

  async confirmPhoneChange(userId: string, newPhone: string, code: string) {
    const [record] = await this.db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, newPhone),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(verificationCodes.createdAt)
      .limit(1);

    if (!record) throw new BadRequestException("Код истёк или не найден");
    if (record.attempts >= AUTH.MAX_ATTEMPTS) {
      throw new BadRequestException("Слишком много попыток — запросите новый код");
    }
    if (record.code !== code) {
      await this.db
        .update(verificationCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(verificationCodes.id, record.id));
      throw new BadRequestException("Неверный код");
    }

    // Ensure not taken meanwhile
    const [taken] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, newPhone))
      .limit(1);
    if (taken && taken.id !== userId) {
      throw new BadRequestException("Этот номер уже используется");
    }

    const me = await this.getById(userId);

    await this.db.delete(verificationCodes).where(eq(verificationCodes.phone, newPhone));

    const [updated] = await this.db
      .update(users)
      .set({ phone: newPhone })
      .where(eq(users.id, userId))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: userId,
      oldValue: { phone: me.phone },
      newValue: { phone: newPhone },
    });

    return updated;
  }
}
