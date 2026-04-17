"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* ── mock data ──────────────────────────────────────────── */

interface ArchivedCar {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  ownerType: string;
  archivedAt: string;
}

const ARCHIVED_CARS: ArchivedCar[] = [
  { id: 101, brand: "Kia", model: "Rio", year: 2021, price: 950000, mileage: 68000, ownerType: "Таксопарк", archivedAt: "10.03.2026" },
  { id: 102, brand: "Hyundai", model: "Solaris", year: 2020, price: 820000, mileage: 95000, ownerType: "Физ лицо", archivedAt: "05.03.2026" },
  { id: 103, brand: "Skoda", model: "Rapid", year: 2022, price: 1290000, mileage: 38000, ownerType: "ЮР лицо", archivedAt: "28.02.2026" },
  { id: 104, brand: "Toyota", model: "Camry", year: 2019, price: 1850000, mileage: 108000, ownerType: "Банк", archivedAt: "20.02.2026" },
  { id: 105, brand: "Volkswagen", model: "Polo", year: 2020, price: 980000, mileage: 72000, ownerType: "Таксопарк", archivedAt: "15.02.2026" },
  { id: 106, brand: "Chevrolet", model: "Cobalt", year: 2019, price: 690000, mileage: 112000, ownerType: "Физ лицо", archivedAt: "10.02.2026" },
];

const ownerBadgeVariant = (type: string) => {
  switch (type) {
    case "Таксопарк": return "yellow" as const;
    case "Банк": return "red" as const;
    case "ЮР лицо": return "green" as const;
    default: return "gray" as const;
  }
};

/* ── page ───────────────────────────────────────────────── */

export default function BuyoutArchivePage() {
  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <nav className="flex items-center gap-2 text-xs text-[#A1A1A1] mb-3">
                <Link href="/buyout" className="hover:text-[#303030] transition-colors">Выкуп авто</Link>
                <span>/</span>
                <span className="text-[#303030]">Архив</span>
              </nav>
              <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
                Архив объявлений
              </h1>
              <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
                Это архив &mdash; машины уже выкуплены и недоступны для бронирования.
                Список сохранён для истории и анализа рынка.
              </p>
            </div>
            <div className="bg-gray-200 rounded-xl px-6 py-3 inline-flex items-center gap-2 shrink-0">
              <span className="text-2xl md:text-3xl font-medium text-[#303030]">{ARCHIVED_CARS.length}</span>
              <span className="text-xs text-[#303030]/70">архивных</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* Info block */}
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#FA6868] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-[#303030]">
            Это архив &mdash; машины уже выкуплены. Для активных объявлений{" "}
            <Link href="/buyout" className="underline font-medium">перейдите в каталог</Link>.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ARCHIVED_CARS.map((car) => (
            <div
              key={car.id}
              className="block bg-white rounded-xl overflow-hidden border border-[#E5E5E5] opacity-90"
            >
              {/* Photo placeholder */}
              <div className="relative h-[200px] bg-gray-200 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                  <span className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-full uppercase tracking-wider">
                    Архив
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-medium text-[#303030]">
                    {car.brand} {car.model} {car.year}
                  </h3>
                  <Badge variant={ownerBadgeVariant(car.ownerType)}>{car.ownerType}</Badge>
                </div>
                <p className="text-xl font-medium text-[#A1A1A1] line-through mb-1">
                  {car.price.toLocaleString("ru-RU")} ₽
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#A1A1A1]">
                    Пробег: {car.mileage.toLocaleString("ru-RU")} км
                  </span>
                  <span className="text-xs text-[#A1A1A1]">
                    Выкуплено {car.archivedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back to catalog CTA */}
        <div className="flex justify-center">
          <Link
            href="/buyout"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К активным объявлениям
          </Link>
        </div>
      </div>
    </>
  );
}
