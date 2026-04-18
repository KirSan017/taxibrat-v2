import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { desc, eq, and, sql, ilike } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import {
  users,
  taxiParks,
  no9Orders,
  buyoutListings,
  parkClasses,
} from "@taxibrat/db";

const STATS_USERS_OFFSET = 615;
const STATS_NO9_OFFSET = 309;

@Injectable()
export class PublicService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private config: ConfigService,
  ) {}

  async getHonorBoard(limit = 10) {
    const rows = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        successfulParkChecks: users.successfulParkChecks,
      })
      .from(users)
      .where(sql`${users.successfulParkChecks} > 0`)
      .orderBy(desc(users.successfulParkChecks))
      .limit(limit);

    return rows.map((r) => {
      const firstName = r.firstName ?? "";
      const lastName = r.lastName ?? "";
      const displayName = lastName
        ? `${firstName ? firstName.charAt(0) + "." : ""} ${lastName}`.trim()
        : firstName || "Пользователь";
      const avatar = (firstName || lastName || "?").charAt(0).toUpperCase();
      return {
        id: r.id,
        name: displayName,
        checks: r.successfulParkChecks,
        avatar,
      };
    });
  }

  async getStats() {
    const [
      usersCountRow,
      parksCountRow,
      no9CountRow,
      buyoutCountRow,
    ] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(users),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(taxiParks)
        .where(eq(taxiParks.status, "ACTIVE")),
      this.db.select({ count: sql<number>`count(*)` }).from(no9Orders),
      this.db.select({ count: sql<number>`count(*)` }).from(buyoutListings),
    ]);

    return {
      users: Number(usersCountRow[0].count) + STATS_USERS_OFFSET,
      parks: Number(parksCountRow[0].count),
      no9Orders: Number(no9CountRow[0].count) + STATS_NO9_OFFSET,
      buyoutCars: Number(buyoutCountRow[0].count),
    };
  }

  async searchParkByName(query: string) {
    const q = query.trim();
    if (q.length < 2) return { found: null };

    const [park] = await this.db
      .select({
        id: taxiParks.id,
        name: taxiParks.name,
        status: taxiParks.status,
      })
      .from(taxiParks)
      .where(
        and(
          eq(taxiParks.status, "ACTIVE"),
          ilike(taxiParks.name, `%${q}%`),
        ),
      )
      .limit(1);

    if (!park) return { found: null };

    // Determine park's average class rating
    const [ratingRow] = await this.db
      .select({
        avgRating: sql<number>`coalesce(avg(${parkClasses.rating}::numeric), 0)`,
      })
      .from(parkClasses)
      .where(eq(parkClasses.parkId, park.id));

    const parkAvg = Number(ratingRow?.avgRating ?? 0);

    // Overall average across all active parks
    const [globalRow] = await this.db
      .select({
        avgRating: sql<number>`coalesce(avg(${parkClasses.rating}::numeric), 0)`,
      })
      .from(parkClasses)
      .innerJoin(taxiParks, eq(parkClasses.parkId, taxiParks.id))
      .where(eq(taxiParks.status, "ACTIVE"));

    const globalAvg = Number(globalRow?.avgRating ?? 0);
    const hiddenAboveAverage = parkAvg > globalAvg;

    return {
      found: { id: park.id, name: park.name },
      parkRating: parkAvg,
      globalRating: globalAvg,
      hiddenAboveAverage,
    };
  }

  async addressSuggest(q: string) {
    const query = (q || "").trim();
    if (query.length < 2) return { suggestions: [], query };

    const token = this.config.get<string>("DADATA_API_KEY");
    if (!token) {
      return { suggestions: [], query };
    }

    try {
      const res = await fetch(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query,
            count: 5,
            locations: [{ region: "Москва" }, { region: "Московская" }],
          }),
        },
      );

      if (!res.ok) return { suggestions: [], query };
      const data = (await res.json()) as { suggestions?: Array<{ value: string; unrestricted_value?: string; data?: unknown }> };
      const suggestions = (data.suggestions ?? []).map((s) => ({
        value: s.value,
        unrestricted_value: s.unrestricted_value ?? s.value,
      }));
      return { suggestions, query };
    } catch {
      return { suggestions: [], query };
    }
  }
}
