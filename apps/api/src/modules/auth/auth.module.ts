import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { createDb } from "@taxibrat/db";
import Redis from "ioredis";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { ExolveProvider } from "./providers/exolve.provider";
import { TelegramProvider } from "./providers/telegram.provider";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ExolveProvider,
    TelegramProvider,
    {
      provide: "DATABASE",
      useFactory: (config: ConfigService) => createDb(config.get("DATABASE_URL")!),
      inject: [ConfigService],
    },
    {
      provide: "REDIS",
      useFactory: (config: ConfigService) => new Redis(config.get("REDIS_URL")!),
      inject: [ConfigService],
    },
    { provide: "EXOLVE_PROVIDER", useExisting: ExolveProvider },
    { provide: "TELEGRAM_PROVIDER", useExisting: TelegramProvider },
  ],
  exports: ["DATABASE", "REDIS"],
})
export class AuthModule {}
