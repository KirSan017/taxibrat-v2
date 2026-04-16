import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ParkCardData {
  id: number;
  name: string;
  hidden?: boolean;
  driverClass: string;
  rating: number;
  rent: number;
  deposit: number;
  commission: number;
  advertised?: boolean;
  reviewCount?: number;
  lastReviewDate?: string;
  lastReviewAuthor?: string;
}

interface ParkCardProps {
  park: ParkCardData;
}

export function ParkCard({ park }: ParkCardProps) {
  const displayName = park.hidden ? "Название скрыто" : park.name;

  return (
    <div
      className={`bg-white rounded-xl p-5 md:p-6 transition-shadow hover:shadow-md ${
        park.advertised
          ? "border-2 border-green-500 ring-1 ring-green-500/20"
          : "border border-[#E5E5E5]"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {/* Stars */}
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(park.rating) ? "text-[#F8D62E]" : "text-[#E5E5E5]"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-base font-medium text-[#303030]">{park.rating.toFixed(2)}</span>
          </div>

          <h3 className="text-base font-medium text-[#303030] truncate">{displayName}</h3>

          <div className="mt-2 flex items-center gap-2">
            <Badge variant={park.driverClass === "Бизнес" || park.driverClass === "Комфорт+" ? "yellow" : "gray"}>
              {park.driverClass}
            </Badge>
            {park.advertised && <Badge variant="green">Рекомендуем</Badge>}
          </div>
        </div>

        {/* Right: params */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm shrink-0">
          <div>
            <p className="text-[#A1A1A1] text-xs">Аренда</p>
            <p className="font-medium text-[#303030]">{park.rent.toLocaleString("ru-RU")} руб.</p>
          </div>
          <div>
            <p className="text-[#A1A1A1] text-xs">Залог</p>
            <p className="font-medium text-[#303030]">{park.deposit.toLocaleString("ru-RU")} руб.</p>
          </div>
          <div>
            <p className="text-[#A1A1A1] text-xs">Комиссия</p>
            <p className="font-medium text-[#303030]">{park.commission}%</p>
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {park.lastReviewDate && (
          <p className="text-xs text-[#A1A1A1]">
            <span className="inline-block w-2 h-2 bg-[#A1A1A1] rounded-full mr-1.5 align-middle" />
            {park.lastReviewDate} &middot; {park.lastReviewAuthor}
          </p>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <Link href={`/parks/${park.id}`}>
            <Button size="sm" variant="outline">
              Подробнее
            </Button>
          </Link>
          <Button size="sm">8 800 000 00 00</Button>
        </div>
      </div>
    </div>
  );
}
