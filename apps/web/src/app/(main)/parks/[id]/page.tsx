"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── mock data ──────────────────────────────────────────── */

const MOCK_PARK = {
  id: 1,
  name: "СитиМобил Парк",
  hidden: false,
  rating: 4.25,
  reviewCount: 48,
  address: "г. Москва, ул. Автозаводская, д. 23, стр. 1",
  driverClass: "Эконом",
  description: "Один из крупнейших таксопарков Москвы. Работает с 2018 года. Собственный автопарк из 200+ автомобилей.",
};

const PARK_PARAMS = [
  { name: "Комиссия парка", value: "2%" },
  { name: "Аренда в сутки", value: "2 000 руб." },
  { name: "Залог", value: "5 000 руб." },
  { name: "Минимальный стаж", value: "1 год" },
  { name: "Возраст водителя", value: "от 21 года" },
  { name: "Брендирование", value: "Обязательно" },
  { name: "Топливная карта", value: "Да" },
  { name: "Мойка", value: "Бесплатно" },
  { name: "ТО и ремонт", value: "За счёт парка" },
  { name: "Штраф за простой", value: "500 руб./день" },
  { name: "График работы", value: "6/1 или 12/12" },
  { name: "Выходные", value: "По договоренности" },
  { name: "Газовое оборудование", value: "На части авто" },
  { name: "Детское кресло", value: "Нет" },
  { name: "Подменный автомобиль", value: "Да" },
  { name: "Система мониторинга", value: "GPS-трекер" },
  { name: "Штрафы ГИБДД", value: "За счёт водителя" },
  { name: "Каско", value: "Включено" },
  { name: "ОСАГО", value: "Включено" },
  { name: "Способ оплаты аренды", value: "Наличные / Карта" },
];

const VEHICLES = [
  { id: 1, brand: "Kia", model: "Rio", year: 2023, rent: 2000, available: true },
  { id: 2, brand: "Hyundai", model: "Solaris", year: 2022, rent: 1900, available: true },
  { id: 3, brand: "Skoda", model: "Rapid", year: 2023, rent: 2100, available: false },
  { id: 4, brand: "Volkswagen", model: "Polo", year: 2022, rent: 1800, available: true },
  { id: 5, brand: "Kia", model: "Rio", year: 2021, rent: 1700, available: false },
];

/* ── component ──────────────────────────────────────────── */

export default function ParkDetailPage() {
  const [showAllParams, setShowAllParams] = useState(false);
  const [isRegistered] = useState(true); // Mock: toggle to test blur overlay

  const park = MOCK_PARK;
  const visibleParams = showAllParams ? PARK_PARAMS : PARK_PARAMS.slice(0, 8);

  return (
    <>
      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#A1A1A1] mb-6">
          <Link href="/parks" className="hover:text-[#303030] transition-colors">Таксопарки</Link>
          <span>/</span>
          <span className="text-[#303030]">{park.hidden ? "Название скрыто" : park.name}</span>
        </nav>

        {/* ══════ HEADER ══════ */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-[32px] font-medium text-[#303030]">
                {park.hidden ? (
                  <span className="flex items-center gap-2">
                    Название скрыто
                    <svg className="w-6 h-6 text-[#A1A1A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                ) : park.name}
              </h1>
              <Badge variant={park.driverClass === "Бизнес" || park.driverClass === "Комфорт+" ? "yellow" : "gray"}>
                {park.driverClass}
              </Badge>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl md:text-[40px] font-medium text-[#303030]">{park.rating.toFixed(2)}</span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(park.rating) ? "text-[#F8D62E]" : "text-[#E5E5E5]"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-[#A1A1A1]">{park.reviewCount} отзывов</span>
            </div>

            {/* Address */}
            <p className="text-sm text-[#A1A1A1]">
              {park.hidden ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Адрес скрыт
                </span>
              ) : park.address}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button size="lg">Взять в аренду</Button>
            <Button size="lg" variant="outline">Неверная информация</Button>
          </div>
        </div>

        {/* ══════ PARAMETERS TABLE ══════ */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Параметры парка</h2>

          <div className="relative">
            <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
              {visibleParams.map((param, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 text-sm ${
                    i !== visibleParams.length - 1 ? "border-b border-[#E5E5E5]" : ""
                  }`}
                >
                  <span className="text-[#A1A1A1]">{param.name}</span>
                  <span className="font-medium text-[#303030]">{param.value}</span>
                </div>
              ))}
            </div>

            {/* Blur overlay for non-registered */}
            {!isRegistered && !showAllParams && (
              <div className="absolute inset-0 top-[50%] flex items-center justify-center rounded-b-xl overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60" />
                <div className="relative text-center">
                  <svg className="w-8 h-8 text-[#A1A1A1] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm font-medium text-[#303030]">Зарегистрируйтесь для просмотра</p>
                  <p className="text-xs text-[#A1A1A1] mt-1">Полные данные доступны авторизованным пользователям</p>
                </div>
              </div>
            )}
          </div>

          {isRegistered && PARK_PARAMS.length > 8 && (
            <button
              onClick={() => setShowAllParams(!showAllParams)}
              className="mt-3 text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors"
            >
              {showAllParams ? "Скрыть" : `Показать все (${PARK_PARAMS.length})`}
            </button>
          )}
        </section>

        {/* ══════ VEHICLES ══════ */}
        <section className="mb-12">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Автомобили парка</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VEHICLES.map((v) => (
              <div key={v.id} className="bg-white border border-[#E5E5E5] rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-medium text-[#303030]">
                    {v.brand} {v.model} {v.year}
                  </h3>
                  <Badge variant={v.available ? "green" : "red"}>
                    {v.available ? "Свободен" : "Занят"}
                  </Badge>
                </div>
                <p className="text-lg font-medium text-[#303030]">
                  {v.rent.toLocaleString("ru-RU")} руб./сут.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
