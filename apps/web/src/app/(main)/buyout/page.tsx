"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── mock data ──────────────────────────────────────────── */

const BRANDS = ["Все", "Kia", "Hyundai", "Skoda", "Toyota", "Volkswagen", "Chevrolet"];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Все: ["Все"],
  Kia: ["Все", "Rio", "K5", "Sportage"],
  Hyundai: ["Все", "Solaris", "Sonata", "Tucson"],
  Skoda: ["Все", "Rapid", "Octavia", "Superb"],
  Toyota: ["Все", "Camry", "Corolla", "RAV4"],
  Volkswagen: ["Все", "Polo", "Jetta", "Tiguan"],
  Chevrolet: ["Все", "Cobalt", "Nexia"],
};

const YEARS = ["Все", "2024", "2023", "2022", "2021", "2020", "2019"];

const OWNER_TYPES = ["Все", "Физ лицо", "ЮР лицо", "Таксопарк", "Банк"];

interface BuyoutCar {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  ownerType: string;
  advertised: boolean;
}

const MOCK_CARS: BuyoutCar[] = [
  { id: 1, brand: "Kia", model: "Rio", year: 2022, price: 1150000, mileage: 45000, ownerType: "Таксопарк", advertised: true },
  { id: 2, brand: "Hyundai", model: "Solaris", year: 2021, price: 980000, mileage: 62000, ownerType: "Физ лицо", advertised: true },
  { id: 3, brand: "Skoda", model: "Rapid", year: 2023, price: 1350000, mileage: 28000, ownerType: "ЮР лицо", advertised: false },
  { id: 4, brand: "Toyota", model: "Camry", year: 2022, price: 2400000, mileage: 35000, ownerType: "Банк", advertised: false },
  { id: 5, brand: "Volkswagen", model: "Polo", year: 2021, price: 1050000, mileage: 58000, ownerType: "Таксопарк", advertised: false },
  { id: 6, brand: "Kia", model: "K5", year: 2023, price: 2100000, mileage: 18000, ownerType: "ЮР лицо", advertised: true },
  { id: 7, brand: "Hyundai", model: "Sonata", year: 2022, price: 1800000, mileage: 42000, ownerType: "Физ лицо", advertised: false },
  { id: 8, brand: "Chevrolet", model: "Cobalt", year: 2020, price: 750000, mileage: 85000, ownerType: "Таксопарк", advertised: false },
  { id: 9, brand: "Skoda", model: "Octavia", year: 2023, price: 2050000, mileage: 15000, ownerType: "Банк", advertised: false },
  { id: 10, brand: "Toyota", model: "Corolla", year: 2021, price: 1650000, mileage: 55000, ownerType: "Физ лицо", advertised: false },
  { id: 11, brand: "Kia", model: "Sportage", year: 2022, price: 2250000, mileage: 30000, ownerType: "ЮР лицо", advertised: false },
  { id: 12, brand: "Hyundai", model: "Tucson", year: 2023, price: 2600000, mileage: 12000, ownerType: "Банк", advertised: false },
];

const ITEMS_PER_PAGE = 8;

/* ── component ──────────────────────────────────────────── */

export default function BuyoutPage() {
  const [brand, setBrand] = useState("Все");
  const [model, setModel] = useState("Все");
  const [year, setYear] = useState("Все");
  const [ownerType, setOwnerType] = useState("Все");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const models = MODELS_BY_BRAND[brand] || ["Все"];

  const filtered = MOCK_CARS.filter((car) => {
    if (brand !== "Все" && car.brand !== brand) return false;
    if (model !== "Все" && car.model !== model) return false;
    if (year !== "Все" && car.year !== Number(year)) return false;
    if (ownerType !== "Все" && car.ownerType !== ownerType) return false;
    if (priceFrom && car.price < Number(priceFrom)) return false;
    if (priceTo && car.price > Number(priceTo)) return false;
    return true;
  }).sort((a, b) => {
    if (a.advertised !== b.advertised) return a.advertised ? -1 : 1;
    return a.price - b.price;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const ownerBadgeVariant = (type: string) => {
    switch (type) {
      case "Таксопарк": return "yellow" as const;
      case "Банк": return "red" as const;
      case "ЮР лицо": return "green" as const;
      default: return "gray" as const;
    }
  };

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
                Выкуп авто
              </h1>
              <p className="mt-3 text-sm text-[#A1A1A1] max-w-md leading-relaxed">
                Подберите автомобиль для работы в такси с выгодными условиями выкупа от проверенных парков и владельцев.
              </p>
            </div>
            <div className="bg-[#F8D62E] rounded-xl px-6 py-3 inline-flex items-center gap-2 shrink-0">
              <span className="text-2xl md:text-3xl font-medium text-[#303030]">{MOCK_CARS.length}</span>
              <span className="text-xs text-[#303030]/70">объявлений</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* ══════ FILTERS ══════ */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Brand */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Марка</label>
              <select
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setModel("Все"); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Модель</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Год</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Owner type */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Владелец</label>
              <select
                value={ownerType}
                onChange={(e) => setOwnerType(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {OWNER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Price from */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Цена от</label>
              <input
                type="number"
                placeholder="500 000"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
              />
            </div>

            {/* Price to */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Цена до</label>
              <input
                type="number"
                placeholder="3 000 000"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
              />
            </div>

            {/* Show button */}
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button size="sm" className="w-full" onClick={() => setCurrentPage(1)}>
                Показать {filtered.length} шт
              </Button>
            </div>
          </div>
        </section>

        {/* ══════ RESULTS ══════ */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#A1A1A1]">
            Найдено <span className="text-[#303030] font-medium">{filtered.length}</span> объявлений
          </p>
        </div>

        {/* ══════ CARDS GRID ══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {paginated.map((car) => (
            <Link
              key={car.id}
              href={`/buyout/${car.id}`}
              className={`block bg-white rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
                car.advertised
                  ? "border-2 border-green-500 ring-1 ring-green-500/20"
                  : "border border-[#E5E5E5]"
              }`}
            >
              {/* Photo carousel placeholder */}
              <div className="relative h-[200px] bg-gray-200 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                {car.advertised && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="green">Рекомендуем</Badge>
                  </div>
                )}
                {/* Dots for carousel */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "bg-white" : "bg-white/50"}`} />
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-medium text-[#303030]">
                    {car.brand} {car.model} {car.year}
                  </h3>
                  <Badge variant={ownerBadgeVariant(car.ownerType)}>{car.ownerType}</Badge>
                </div>
                <p className="text-xl font-medium text-[#303030] mb-1">
                  {car.price.toLocaleString("ru-RU")} ₽
                </p>
                <p className="text-sm text-[#A1A1A1]">
                  Пробег: {car.mileage.toLocaleString("ru-RU")} км
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ══════ PAGINATION ══════ */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-1 mb-12">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
            >
              &laquo;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === currentPage
                    ? "bg-[#303030] text-white"
                    : "text-[#303030] hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
            >
              &raquo;
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
