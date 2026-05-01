import { Injectable } from "@nestjs/common";
import { RatingRecalculator } from "../rating/rating.recalculator";

export interface ParkClassRow {
  id: string;
  parkName: string;
  parkAddress: string | null;
  parkPhone: string | null;
  isAdvertised: boolean;
  isSuperAdvertised: boolean;
  rating: string;
  [key: string]: unknown;
}

@Injectable()
export class VisibilityService {
  constructor(private recalculator: RatingRecalculator) {}

  async applyMask(
    rows: ParkClassRow[],
    user: { sub: string; role: string } | null,
  ): Promise<ParkClassRow[]> {
    const avgRating = await this.recalculator.getAvgRating();

    return rows.map((row) => {
      const rating = parseFloat(row.rating) || 0;
      const isHigh = rating > avgRating;
      const isAd = row.isAdvertised || row.isSuperAdvertised;

      const masked = { ...row };

      if (!user) {
        // Anonymous: minimal
        masked.parkAddress = null;
        masked.parkPhone = null;
        (masked as any).addressHidden = true;
        (masked as any).phoneHidden = true;
        (masked as any).detailsBlurred = true;
        // Per ТЗ: для анонима с парков с высоким рейтингом без рекламы скрываем
        // также название, чтобы стимулировать регистрацию.
        if (isHigh && !isAd) {
          masked.parkName = null as any;
          (masked as any).nameHidden = true;
        }
      } else if (isHigh && !isAd) {
        // Auth + high rating + not advertised: hide name/address/phone
        masked.parkName = null as any;
        masked.parkAddress = null;
        masked.parkPhone = null;
        (masked as any).nameHidden = true;
        (masked as any).addressHidden = true;
        (masked as any).phoneHidden = true;
      } else if (!isAd) {
        // Auth + low rating + not advertised: hide phone only
        masked.parkPhone = null;
        (masked as any).phoneHidden = true;
      }
      // Advertised: show everything (phone only to auth users)
      if (isAd && !user) {
        masked.parkPhone = null;
        (masked as any).phoneHidden = true;
      }

      return masked;
    });
  }
}
