import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { users, sessions, verificationCodes } from "@taxibrat/db";
import { AUTH, VerificationMethod } from "@taxibrat/shared";
import { ExolveProvider } from "./providers/exolve.provider";
import { TelegramProvider } from "./providers/telegram.provider";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import type Redis from "ioredis";
import { randomBytes } from "crypto";
import { sign, verify } from "jsonwebtoken";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject("REDIS") private redis: Redis,
    @Inject("EXOLVE_PROVIDER") private exolve: ExolveProvider,
    @Inject("TELEGRAM_PROVIDER") private telegram: TelegramProvider,
    private config: ConfigService,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateReferralCode(): string {
    return randomBytes(6).toString("base64url").slice(0, 8);
  }

  async sendCode(phone: string, method: VerificationMethod) {
    await this.db.delete(verificationCodes).where(eq(verificationCodes.phone, phone));

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + AUTH.CODE_TTL_MINUTES * 60 * 1000);

    await this.db.insert(verificationCodes).values({
      phone,
      code,
      method,
      expiresAt,
      attempts: 0,
    });

    const sent =
      method === VerificationMethod.SMS
        ? await this.exolve.sendSms(phone, code)
        : await this.telegram.sendCode(phone, code);

    if (!sent) {
      throw new BadRequestException("Failed to send verification code");
    }

    return { codeSent: true };
  }

  async verifyCode(phone: string, code: string, referralCode?: string) {
    const [record] = await this.db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, phone),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(verificationCodes.createdAt)
      .limit(1);

    if (!record) {
      throw new UnauthorizedException("Code expired or not found");
    }

    if (record.attempts >= AUTH.MAX_ATTEMPTS) {
      throw new UnauthorizedException("Too many attempts, request a new code");
    }

    if (record.code !== code) {
      await this.db
        .update(verificationCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(verificationCodes.id, record.id));
      throw new UnauthorizedException("Invalid code");
    }

    await this.db.delete(verificationCodes).where(eq(verificationCodes.phone, phone));

    let [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    let isNewUser = false;
    if (!user) {
      // Resolve inviter by referral code (if provided and valid)
      let referredById: string | undefined;
      if (referralCode) {
        const [inviter] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.referralCode, referralCode))
          .limit(1);
        if (inviter) referredById = inviter.id;
      }

      [user] = await this.db
        .insert(users)
        .values({
          phone,
          referralCode: this.generateReferralCode(),
          referredById,
        })
        .returning();
      isNewUser = true;
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user), isNewUser };
  }

  async refreshToken(refreshToken: string) {
    const storedUserId = await this.redis.get(`refresh:${refreshToken}`);
    if (!storedUserId) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const allSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, storedUserId));

    let validSession = null;
    for (const s of allSessions) {
      if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
        validSession = s;
        break;
      }
    }

    if (!validSession || validSession.expiresAt < new Date()) {
      await this.redis.del(`refresh:${refreshToken}`);
      throw new UnauthorizedException("Session expired");
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, storedUserId))
      .limit(1);

    if (!user) throw new UnauthorizedException("User not found");

    await this.db.delete(sessions).where(eq(sessions.id, validSession.id));
    await this.redis.del(`refresh:${refreshToken}`);

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async logout(refreshToken: string) {
    // Try to find userId by refresh token via Redis first (fast path)
    const storedUserId = await this.redis.get(`refresh:${refreshToken}`);
    await this.redis.del(`refresh:${refreshToken}`);

    if (storedUserId) {
      // Only scan sessions for this specific user (bounded set)
      const userSessions = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, storedUserId));
      for (const s of userSessions) {
        if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
          await this.db.delete(sessions).where(eq(sessions.id, s.id));
          break;
        }
      }
    } else {
      // Fallback: full scan (legacy tokens with no redis entry)
      const allSessions = await this.db.select().from(sessions);
      for (const s of allSessions) {
        if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
          await this.db.delete(sessions).where(eq(sessions.id, s.id));
          break;
        }
      }
    }

    return { loggedOut: true };
  }

  private async generateTokens(user: typeof users.$inferSelect) {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = sign(payload, this.config.get("JWT_SECRET")!, {
      expiresIn: this.config.get("JWT_ACCESS_TTL"),
    });

    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + AUTH.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    await this.redis.set(
      `refresh:${refreshToken}`,
      user.id,
      "EX",
      AUTH.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      patronymic: user.patronymic,
      email: user.email,
      birthDate: user.birthDate,
      photoUrl: user.photoUrl,
      role: user.role,
      status: user.status,
      friendshipPoints: user.friendshipPoints,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
