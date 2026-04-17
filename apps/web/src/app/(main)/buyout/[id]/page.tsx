"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── mock data ──────────────────────────────────────────── */

const MOCK_CAR = {
  id: 1,
  brand: "Kia",
  model: "Rio",
  year: 2022,
  price: 1150000,
  mileage: 45000,
  ownerType: "Таксопарк",
  vin7: "KNA****",
  description:
    "Автомобиль в отличном состоянии, обслуживался у официального дилера. Один владелец. Полный комплект зимней и летней резины. Идеально подходит для работы в такси — экономичный расход топлива, просторный салон. Без ДТП, без покраски.",
  photos: 6,
};

const SIMILAR_CARS = [
  { id: 2, brand: "Hyundai", model: "Solaris", year: 2021, price: 980000, mileage: 62000, ownerType: "Физ лицо" },
  { id: 3, brand: "Skoda", model: "Rapid", year: 2023, price: 1350000, mileage: 28000, ownerType: "ЮР лицо" },
  { id: 5, brand: "Volkswagen", model: "Polo", year: 2021, price: 1050000, mileage: 58000, ownerType: "Таксопарк" },
  { id: 8, brand: "Chevrolet", model: "Cobalt", year: 2020, price: 750000, mileage: 85000, ownerType: "Таксопарк" },
  { id: 10, brand: "Toyota", model: "Corolla", year: 2021, price: 1650000, mileage: 55000, ownerType: "Физ лицо" },
  { id: 7, brand: "Hyundai", model: "Sonata", year: 2022, price: 1800000, mileage: 42000, ownerType: "Физ лицо" },
  { id: 6, brand: "Kia", model: "K5", year: 2023, price: 2100000, mileage: 18000, ownerType: "ЮР лицо" },
  { id: 9, brand: "Skoda", model: "Octavia", year: 2023, price: 2050000, mileage: 15000, ownerType: "Банк" },
];

/* ── component ──────────────────────────────────────────── */

export default function BuyoutDetailPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingSent, setBookingSent] = useState(false);

  const car = MOCK_CAR;

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
      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#A1A1A1] mb-6">
          <Link href="/buyout" className="hover:text-[#303030] transition-colors">Выкуп авто</Link>
          <span>/</span>
          <span className="text-[#303030]">{car.brand} {car.model} {car.year}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* ══════ PHOTO SLIDER ══════ */}
          <div>
            {/* Main photo */}
            <div className="relative bg-gray-200 rounded-xl h-[300px] md:h-[400px] flex items-center justify-center mb-3">
              <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                {currentSlide + 1} / {car.photos}
              </span>
              {/* Nav arrows */}
              <button
                onClick={() => setCurrentSlide((p) => (p > 0 ? p - 1 : car.photos - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center text-[#303030] hover:bg-white transition-colors"
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setCurrentSlide((p) => (p < car.photos - 1 ? p + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center text-[#303030] hover:bg-white transition-colors"
              >
                &rsaquo;
              </button>
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {Array.from({ length: car.photos }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex-none w-16 h-16 rounded-lg bg-gray-200 border-2 transition-colors ${
                    i === currentSlide ? "border-[#303030]" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ══════ CAR INFO ══════ */}
          <div>
            <h1 className="text-2xl md:text-[32px] font-medium text-[#303030] mb-3">
              {car.brand} {car.model} {car.year}
            </h1>

            <p className="text-3xl md:text-[40px] font-medium text-[#303030] mb-4">
              {car.price.toLocaleString("ru-RU")} ₽
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge variant={ownerBadgeVariant(car.ownerType)}>{car.ownerType}</Badge>
              <span className="text-sm text-[#A1A1A1]">Пробег: {car.mileage.toLocaleString("ru-RU")} км</span>
              <span className="text-sm text-[#A1A1A1]">VIN: {car.vin7}</span>
            </div>

            <div className="bg-[#F3F1E7] rounded-xl p-5 mb-6">
              <h3 className="text-sm font-medium text-[#303030] mb-2">Описание</h3>
              <p className="text-sm text-[#A1A1A1] leading-relaxed">{car.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" onClick={() => setShowBooking(true)}>
                Забронировать
              </Button>
              <Link href="/support">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Поддержка
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════ SIMILAR CARS ══════ */}
        <section className="mb-12">
          <h2 className="text-xl font-medium text-[#303030] mb-6">Похожие автомобили</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
            {SIMILAR_CARS.map((sc) => (
              <Link
                key={sc.id}
                href={`/buyout/${sc.id}`}
                className="flex-none w-[240px] snap-start border border-[#E5E5E5] rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white"
              >
                <div className="h-[140px] bg-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-[#303030] mb-1">
                    {sc.brand} {sc.model} {sc.year}
                  </h3>
                  <p className="text-base font-medium text-[#303030] mb-1">
                    {sc.price.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-xs text-[#A1A1A1]">{sc.mileage.toLocaleString("ru-RU")} км</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ══════ BOOKING MODAL ══════ */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowBooking(false); setBookingSent(false); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 md:p-8">
            <button
              onClick={() => { setShowBooking(false); setBookingSent(false); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#A1A1A1] hover:text-[#303030] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {bookingSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[#303030] mb-2">Заявка отправлена!</h3>
                <p className="text-sm text-[#A1A1A1]">Мы свяжемся с вами в ближайшее время</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-medium text-[#303030] mb-1">Забронировать</h3>
                <p className="text-sm text-[#A1A1A1] mb-6">
                  {car.brand} {car.model} {car.year} — {car.price.toLocaleString("ru-RU")} ₽
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#303030] mb-1.5">Имя</label>
                    <input
                      type="text"
                      placeholder="Ваше имя"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#303030] mb-1.5">Телефон</label>
                    <input
                      type="tel"
                      placeholder="+7 (999) 000-00-00"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors"
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setBookingSent(true)}
                  >
                    Отправить заявку
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
