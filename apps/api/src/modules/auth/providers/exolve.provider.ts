import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ExolveProvider {
  private readonly logger = new Logger(ExolveProvider.name);

  constructor(private config: ConfigService) {}

  async sendSms(phone: string, code: string): Promise<boolean> {
    const apiKey = this.config.get("EXOLVE_API_KEY");
    const sender = this.config.get("EXOLVE_SENDER");

    if (!apiKey) {
      this.logger.warn(`[DEV] SMS to ${phone}: code ${code}`);
      return true;
    }

    try {
      const res = await fetch("https://api.exolve.ru/messaging/v1/SendSMS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: sender,
          destination: phone,
          text: `TaxiBrat: ваш код подтверждения ${code}`,
        }),
      });

      if (!res.ok) {
        this.logger.error(`Exolve error: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error("Exolve send failed:", err);
      return false;
    }
  }
}
