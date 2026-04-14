import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, sql, desc } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users, referralEvents } from "@taxibrat/db";
import { ReferralEventType, PointsTransactionType } from "@taxibrat/shared";
import { PointsService } from "../points/points.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    private pointsService: PointsService,
    private settingsService: SettingsService,
  ) {}

  async getMyLink(userId: string) {
    const [user] = await this.db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const code = user?.referralCode ?? "";
    return {
      referralCode: code,
      link: `https://taxibrat.ru/r/${code}`,
    };
  }

  async getFriends(userId: string, page: number, limit: number) {
    const conditions = [eq(users.referredById, userId)];

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getStats(userId: string) {
    const [friendsCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.referredById, userId));

    const [pointsEarned] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${referralEvents.inviterPointsAwarded}), 0)`,
      })
      .from(referralEvents)
      .where(eq(referralEvents.inviterId, userId));

    return {
      totalInvited: Number(friendsCount.count),
      totalPointsEarned: Number(pointsEarned.total),
    };
  }

  async awardRegistrationBonus(inviteeId: string) {
    const [invitee] = await this.db
      .select({ referredById: users.referredById })
      .from(users)
      .where(eq(users.id, inviteeId))
      .limit(1);

    if (!invitee?.referredById) return;

    // Check if registration bonus already awarded
    const [existing] = await this.db
      .select({ id: referralEvents.id })
      .from(referralEvents)
      .where(
        and(
          eq(referralEvents.inviteeId, inviteeId),
          eq(referralEvents.eventType, "REGISTRATION"),
        ),
      )
      .limit(1);

    if (existing) return;

    const inviterBonus = await this.settingsService.getNumber("points_referral_register", 200);
    const inviteeBonus = await this.settingsService.getNumber("points_referral_bonus", 100);

    // Award inviter
    if (inviterBonus > 0) {
      await this.pointsService.award(
        invitee.referredById,
        inviterBonus,
        PointsTransactionType.REFERRAL,
        "Бонус за приглашённого друга (регистрация)",
      );
    }

    // Award invitee
    if (inviteeBonus > 0) {
      await this.pointsService.award(
        inviteeId,
        inviteeBonus,
        PointsTransactionType.REFERRAL,
        "Бонус за регистрацию по реферальной ссылке",
      );
    }

    // Record event
    await this.db.insert(referralEvents).values({
      inviterId: invitee.referredById,
      inviteeId,
      eventType: ReferralEventType.REGISTRATION,
      inviterPointsAwarded: inviterBonus,
      inviteePointsAwarded: inviteeBonus,
    });

    this.logger.log(`Referral registration bonus: inviter=${invitee.referredById}, invitee=${inviteeId}`);
  }

  async awardRentalBonus(inviteeId: string, ticketId: string) {
    await this.awardTicketBonus(inviteeId, ticketId, "RENTAL", "аренду");
  }

  async awardBuyoutBonus(inviteeId: string, ticketId: string) {
    await this.awardTicketBonus(inviteeId, ticketId, "BUYOUT", "выкуп");
  }

  private async awardTicketBonus(
    inviteeId: string,
    ticketId: string,
    eventType: "RENTAL" | "BUYOUT",
    label: string,
  ) {
    const [invitee] = await this.db
      .select({ referredById: users.referredById })
      .from(users)
      .where(eq(users.id, inviteeId))
      .limit(1);

    if (!invitee?.referredById) return;

    // Check one-time per invitee per event type
    const [existing] = await this.db
      .select({ id: referralEvents.id })
      .from(referralEvents)
      .where(
        and(
          eq(referralEvents.inviteeId, inviteeId),
          eq(referralEvents.eventType, eventType),
        ),
      )
      .limit(1);

    if (existing) return;

    const settingKey = eventType === "RENTAL"
      ? "points_referral_rental"
      : "points_referral_buyout";
    const bonus = await this.settingsService.getNumber(settingKey, 100);

    if (bonus > 0) {
      await this.pointsService.award(
        invitee.referredById,
        bonus,
        PointsTransactionType.REFERRAL,
        `Бонус за ${label} приглашённого друга`,
        ticketId,
      );
    }

    await this.db.insert(referralEvents).values({
      inviterId: invitee.referredById,
      inviteeId,
      eventType: eventType as ReferralEventType,
      inviterPointsAwarded: bonus,
      inviteePointsAwarded: 0,
      relatedTicketId: ticketId,
    });

    this.logger.log(`Referral ${eventType} bonus: inviter=${invitee.referredById}, invitee=${inviteeId}, ticket=${ticketId}`);
  }
}
