import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface DaDataSuggestion {
  value: string;
  data: { id: string; name: string };
}

@Injectable()
export class DaDataProvider {
  private readonly logger = new Logger(DaDataProvider.name);

  constructor(private config: ConfigService) {}

  async suggestBrands(query: string): Promise<string[]> {
    const token = this.config.get("DADATA_API_KEY");
    if (!token) {
      this.logger.warn("[DEV] DaData not configured, returning empty");
      return [];
    }

    try {
      const res = await fetch(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/car_brand",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, count: 10 }),
        },
      );

      if (!res.ok) return [];
      const data = (await res.json()) as { suggestions: DaDataSuggestion[] };
      return data.suggestions.map((s) => s.value);
    } catch {
      return [];
    }
  }
}
