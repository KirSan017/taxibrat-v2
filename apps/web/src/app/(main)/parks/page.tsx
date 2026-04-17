"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParkCard, type ParkCardData } from "@/components/parks/park-card";

/* ── mock data ──────────────────────────────────────────── */

const HONOR_BOARD = [
  { id: 1, name: "Алексей М.", checks: 48, avatar: "А" },
  { id: 2, name: "Дмитрий К.", checks: 35, avatar: "Д" },
  { id: 3, name: "Сергей В.", checks: 29, avatar: "С" },
  { id: 4, name: "Игорь Л.", checks: 24, avatar: "И" },
  { id: 5, name: "Андрей П.", checks: 21, avatar: "А" },
  { id: 6, name: "Максим Р.", checks: 18, avatar: "М" },
  { id: 7, name: "Николай Б.", checks: 15, avatar: "Н" },
  { id: 8, name: "Олег Т.", checks: 12, avatar: "О" },
];

const MOCK_PARKS: ParkCardData[] = [
  { id: 1, name: "СитиМобил Парк", driverClass: "Эконом", rating: 4.25, rent: 2000, deposit: 5000, commission: 2, lastReviewDate: "26.02.25", lastReviewAuthor: "Александр Р.", advertised: true },
  { id: 2, name: "Альфа", driverClass: "Комфорт", rating: 4.55, rent: 2500, deposit: 3000, commission: 3, lastReviewDate: "24.02.25", lastReviewAuthor: "Дмитрий К." },
  { id: 3, name: "Название скрыто", driverClass: "Эконом", rating: 4.05, rent: 1800, deposit: 5000, commission: 2, hidden: true, lastReviewDate: "22.02.25", lastReviewAuthor: "Сергей В." },
  { id: 4, name: "Драйв Парк", driverClass: "Бизнес", rating: 4.84, rent: 3500, deposit: 10000, commission: 1, lastReviewDate: "20.02.25", lastReviewAuthor: "Игорь Л.", advertised: true },
  { id: 5, name: "Мега Такси", driverClass: "Эконом", rating: 3.92, rent: 1700, deposit: 3000, commission: 3, lastReviewDate: "18.02.25", lastReviewAuthor: "Андрей П." },
  { id: 6, name: "Премьер Авто", driverClass: "Комфорт+", rating: 4.65, rent: 3000, deposit: 7000, commission: 2, lastReviewDate: "16.02.25", lastReviewAuthor: "Максим Р." },
  { id: 7, name: "Экспресс Парк", driverClass: "Эконом", rating: 4.12, rent: 1900, deposit: 4000, commission: 2, lastReviewDate: "14.02.25", lastReviewAuthor: "Николай Б." },
  { id: 8, name: "Голд Такси", driverClass: "Бизнес", rating: 4.78, rent: 4000, deposit: 12000, commission: 1, lastReviewDate: "12.02.25", lastReviewAuthor: "Олег Т." },
];

const DRIVER_CLASSES = ["Все", "Эконом", "Комфорт", "Комфорт+", "Бизнес"];

const BRANDS = ["Все", "Kia", "Hyundai", "Skoda", "Toyota", "Volkswagen"];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Все: ["Все"],
  Kia: ["Все", "Rio", "K5", "Sportage"],
  Hyundai: ["Все", "Solaris", "Sonata", "Tucson"],
  Skoda: ["Все", "Rapid", "Octavia", "Superb"],
  Toyota: ["Все", "Camry", "Corolla", "RAV4"],
  Volkswagen: ["Все", "Polo", "Jetta", "Tiguan"],
};

const YEARS = ["Все", "2024", "2023", "2022", "2021", "2020"];

const DISTRICTS = [
  "ЦАО", "САО", "СВАО", "ВАО", "ЮВАО", "ЮАО", "ЮЗАО", "ЗАО", "СЗАО",
];

/* ── component ──────────────────────────────────────────── */

export default function ParksPage() {
  const [driverClass, setDriverClass] = useState("Все");
  const [brand, setBrand] = useState("Все");
  const [model, setModel] = useState("Все");
  const [year, setYear] = useState("Все");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const models = MODELS_BY_BRAND[brand] || ["Все"];

  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  // Simple filter (mock — in production this would be server-side)
  const filtered = MOCK_PARKS.filter((p) => {
    if (driverClass !== "Все" && p.driverClass !== driverClass) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const paginated = filtered.slice((currentPage - 1) * 5, currentPage * 5);

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
                Рейтинг таксопарков
                <br />
                №1 в Москве
              </h1>
              <div className="mt-4 bg-[#F8D62E] rounded-xl px-6 py-3 inline-block">
                <span className="text-2xl md:text-3xl font-medium text-[#303030]">143 125</span>
                <span className="ml-2 text-xs text-[#303030]/70">пользователей</span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-[48px] md:text-[64px] font-medium leading-none text-[#F8D62E]">148</span>
              <p className="mt-2 text-sm font-medium text-[#303030]">
                Таксопарков
                <br />
                проверено
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* ══════ HONOR BOARD ══════ */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Доска почёта</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {HONOR_BOARD.map((user, idx) => (
              <div
                key={user.id}
                className="flex-none flex items-center gap-3 bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 min-w-[200px]"
              >
                <div className="w-9 h-9 rounded-full bg-[#F3F1E7] flex items-center justify-center text-sm font-medium text-[#303030] shrink-0">
                  {user.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#303030] truncate">{user.name}</p>
                  <p className="text-xs text-[#A1A1A1]">{user.checks} проверок</p>
                </div>
                {idx < 3 && (
                  <Badge variant="yellow" className="ml-auto shrink-0">
                    #{idx + 1}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ══════ FILTERS ══════ */}
        <section className="mb-8">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Выберите параметры и найдите таксопарк</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Driver class */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Класс водителя</label>
              <select
                value={driverClass}
                onChange={(e) => setDriverClass(e.target.value)}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {DRIVER_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Марка</label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setModel("Все");
                }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
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
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
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
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Show button */}
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button size="sm" className="w-full">
                Показать {filtered.length} шт
              </Button>
            </div>
          </div>

          {/* Districts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {DISTRICTS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDistrict(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDistricts.includes(d)
                    ? "bg-[#303030] text-white border-[#303030]"
                    : "bg-white text-[#303030] border-[#E5E5E5] hover:border-[#303030]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* ══════ RESULTS HEADER ══════ */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#A1A1A1]">
            Всего найдено <span className="text-[#303030] font-medium">{filtered.length}</span> таксопарков
          </p>
        </div>

        {/* ══════ PARKS LIST ══════ */}
        <section className="space-y-4 mb-8">
          {paginated.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl px-6 py-16 text-center">
              <div className="w-16 h-16 bg-[#FAFAFA] rounded-full mx-auto flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#A1A1A1]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-[#303030] mb-1">Ничего не найдено</h3>
              <p className="text-sm text-[#A1A1A1] max-w-sm mx-auto mb-5">
                Попробуйте изменить параметры фильтра — возможно, некоторые условия
                слишком строгие.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDriverClass("Все");
                  setBrand("Все");
                  setModel("Все");
                  setYear("Все");
                  setSelectedDistricts([]);
                  setCurrentPage(1);
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            paginated.map((park) => <ParkCard key={park.id} park={park} />)
          )}
        </section>

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

      {/* ══════ FEATURES GRID (same as home) ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8D62E] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
              <h3 className="text-xl md:text-2xl font-medium leading-snug">
                Получите заказ «По делам»<br />в любом месте за 2 мин,<br />без 9%
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#303030]/70">
                Сервис подачи заказов для водителей такси без комиссии агрегатора.
              </p>
            </div>
            <div className="bg-[#303030] text-white rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
              <h3 className="text-xl md:text-2xl font-medium leading-snug">
                Выкуп<br />автомобилей
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Подберём автомобиль для работы в такси с выгодными условиями выкупа.
              </p>
            </div>
            <div className="bg-white border border-[#E5E5E5] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
              <h3 className="text-xl md:text-2xl font-medium leading-snug">
                Проверка по базе<br />таксопарков
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#A1A1A1]">
                Узнайте реальные условия парка до подключения.
              </p>
            </div>
            <div className="bg-white border border-[#E5E5E5] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
              <h3 className="text-xl md:text-2xl font-medium leading-snug">
                Подключим<br />вас к такси
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#A1A1A1]">
                Поможем выбрать лучший таксопарк под ваши параметры.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
