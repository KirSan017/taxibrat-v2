import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private config: ConfigService) {}

  async sendCode(phone: string, code: string): Promise<boolean> {
    const token = this.config.get("TELEGRAM_GATEWAY_TOKEN");

    if (!token) {
      this.logger.warn(`[DEV] Telegram to ${phone}: code ${code}`);
      return true;
    }

    try {
      const res = await fetch(
        "https://gatewayapi.telegram.org/sendVerificationMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone_number: phone,
            code,
            ttl: 300,
          }),
        },
      );

      if (!res.ok) {
        this.logger.error(`Telegram Gateway error: ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error("Telegram Gateway failed:", err);
      return false;
    }
  }
}
