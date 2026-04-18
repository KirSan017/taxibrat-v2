import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private config: ConfigService) {}

  async sendCode(phone: string, code: string): Promise<boolean> {
    const token = this.config.get("TELEGRAM_GATEWAY_TOKEN");

    // Prefer official Telegram Gateway if configured
    if (token) {
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

    // Fallback: send via bot to admin's chat (dev/MVP mode)
    const adminChatId = this.config.get("ADMIN_TELEGRAM_CHAT_ID");
    if (adminChatId) {
      const sent = await this.sendMessage(
        adminChatId,
        `🔑 <b>Код подтверждения для ${phone}:</b>\n\n<code>${code}</code>\n\nДействует 5 минут.`,
      );
      if (sent) {
        this.logger.log(`Code for ${phone} sent to admin chat ${adminChatId}`);
        return true;
      }
    }

    // Last-resort: log to console (dev mode)
    this.logger.warn(`[DEV] Telegram to ${phone}: code ${code}`);
    return true;
  }

  /**
   * Send a plain text message to a Telegram chat via bot API.
   * Requires TELEGRAM_BOT_TOKEN in env.
   */
  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    const botToken = this.config.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      this.logger.warn(`[DEV] Telegram message to ${chatId}: ${text}`);
      return true;
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(`Telegram bot sendMessage error: ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error("Telegram bot sendMessage failed:", err);
      return false;
    }
  }
}
