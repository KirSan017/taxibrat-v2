import { Injectable, Inject, ConflictException } from "@nestjs/common";
import { eq, ilike } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { carBrands, carModels } from "@taxibrat/db";
import { DaDataProvider } from "./dadata.provider";

@Injectable()
export class BrandsService {
  constructor(
    @Inject("DATABASE") private db: Database,
    private dadata: DaDataProvider,
  ) {}

  async getAllBrands() {
    return this.db.select().from(carBrands).orderBy(carBrands.name);
  }

  async getModelsByBrand(brandId: string) {
    return this.db
      .select()
      .from(carModels)
      .where(eq(carModels.brandId, brandId))
      .orderBy(carModels.name);
  }

  async createBrand(name: string) {
    try {
      const [brand] = await this.db
        .insert(carBrands)
        .values({ name })
        .returning();
      return brand;
    } catch {
      throw new ConflictException("Brand already exists");
    }
  }

  async createModel(brandId: string, name: string) {
    try {
      const [model] = await this.db
        .insert(carModels)
        .values({ brandId, name })
        .returning();
      return model;
    } catch {
      throw new ConflictException("Model already exists for this brand");
    }
  }

  async searchBrands(query: string) {
    // Local search first
    const local = await this.db
      .select()
      .from(carBrands)
      .where(ilike(carBrands.name, `%${query}%`))
      .limit(10);

    if (local.length >= 5) return local;

    // DaData fallback
    const dadataNames = await this.dadata.suggestBrands(query);
    const localNames = new Set(local.map((b) => b.name.toLowerCase()));

    // Auto-create missing brands from DaData
    for (const name of dadataNames) {
      if (!localNames.has(name.toLowerCase())) {
        try {
          const [created] = await this.db
            .insert(carBrands)
            .values({ name })
            .onConflictDoNothing({ target: carBrands.name })
            .returning();
          if (created) local.push(created);
        } catch {}
      }
    }

    return local;
  }
}
