"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/auth-modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { DRIVER_CLASS_LABELS } from "@/lib/labels";

/* ── API types ──────────────────────────────────────────── */

interface ParkClassItem {
  id: string;
  parkName: string | null;
  parkAddress: string | null;
  driverClass: string;
  rating: string | number;
  deposit: number;
  parkCommission: string | number;
  nameHidden?: boolean;
  addressHidden?: boolean;
  detailsBlurred?: boolean;
  isAdvertised?: boolean;
  isSuperAdvertised?: boolean;
}

const FEATURES = [
  {
    title: "Получите заказ «По делам»\nв любом месте за 2 мин,\nбез 9%",
    description: "Сервис подачи заказов для водителей такси без комиссии агрегатора. Экономьте на каждой поездке.",
    color: "bg-[#F8D62E]",
    textColor: "text-[#303030]",
  },
  {
    title: "Выкуп\nавтомобилей",
    description: "Подберём автомобиль для работы в такси с выгодными условиями выкупа от проверенных парков.",
    color: "bg-[#303030]",
    textColor: "text-white",
  },
  {
    title: "Проверка по базе\nтаксопарков",
    description: "Узнайте реальные условия парка до подключения. Независимый рейтинг от водителей.",
    color: "bg-white border border-[#E5E5E5]",
    textColor: "text-[#303030]",
  },
  {
    title: "Подключим\nвас к такси",
    description: "Поможем выбрать лучший таксопарк под ваши параметры: класс, район, автомобиль.",
    color: "bg-white border border-[#E5E5E5]",
    textColor: "text-[#303030]",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [parks, setParks] = useState<ParkClassItem[]>([]);
  const [parksLoading, setParksLoading] = useState(true);

  // Redirect authorized users to /dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    setParksLoading(true);
    api<ParkClassItem[]>("/catalog/classes?limit=8")
      .then((data) => {
        if (!cancelled) setParks(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setParks([]);
      })
      .finally(() => {
        if (!cancelled) setParksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const classLabel = (cls: string) => DRIVER_CLASS_LABELS[cls] ?? cls;

  return (
    <>
      {/* ══════ HERO ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            {/* Left side */}
            <div className="max-w-2xl">
              <p className="text-sm text-[#A1A1A1] mb-3">Сервис для водителей таксистов</p>
              <h1 className="text-3xl md:text-[44px] md:leading-[1.15] font-medium text-[#303030]">
                Выбери лучший таксопарк у себя на районе{" "}
                <span className="text-[#F8D62E]">за 2 минуты</span>
              </h1>
              <p className="mt-5 text-sm text-[#A1A1A1] max-w-md leading-relaxed">
                Первый независимый рейтинг таксопарков Москвы и МО. Узнай реальные условия, сравни парки и начни работать на лучших условиях.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => setAuthOpen(true)}>
                  Зарегистрироваться
                </Button>
                <Link href="/parks">
                  <Button variant="outline" size="lg">
                    Смотреть таксопарки
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side — counter */}
            <div className="bg-[#F8D62E] rounded-2xl px-8 py-6 text-center shrink-0">
              <p className="text-[48px] md:text-[64px] font-medium leading-none text-[#303030]">
                615+
              </p>
              <p className="mt-1 text-xs text-[#303030]/70">Зарегистрированных пользователей</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ STATS + PARKS SLIDER ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 py-12 md:py-16">
          {/* Stats row */}
          <div className="flex items-start gap-6 mb-12">
            <span className="text-[64px] md:text-[78px] font-medium leading-none text-[#F8D62E]">
              148
            </span>
            <p className="mt-3 text-base md:text-lg font-medium text-[#303030] max-w-xs">
              Таксопарков проверено
              <br />в Москве и МО
            </p>
          </div>

          {/* Park cards horizontal scroll */}
          {parksLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex-none w-[280px] h-[220px] rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : parks.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#A1A1A1]">
              Пока нет парков в каталоге
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
              {parks.map((park) => {
                const rating = typeof park.rating === "string" ? parseFloat(park.rating) : park.rating;
                const commission = typeof park.parkCommission === "string" ? parseFloat(park.parkCommission) : park.parkCommission;
                const displayName = park.nameHidden || !park.parkName ? "Название скрыто" : park.parkName;
                const isBusinessClass = park.driverClass === "BUSINESS" || park.driverClass === "COMFORT_PLUS" || park.driverClass === "PREMIER" || park.driverClass === "ELITE";
                return (
                  <Link
                    key={park.id}
                    href={`/parks/${park.id}`}
                    className="flex-none w-[280px] snap-start border border-[#E5E5E5] rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.round(rating) ? "text-[#F8D62E]" : "text-[#E5E5E5]"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-[#303030]">{rating.toFixed(2)}</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#303030] mb-1 truncate">{displayName}</h3>
                    <Badge variant={isBusinessClass ? "yellow" : "gray"}>
                      {classLabel(park.driverClass)}
                    </Badge>
                    <div className="mt-4 space-y-1.5 text-xs text-[#A1A1A1]">
                      <div className="flex justify-between">
                        <span>Залог</span>
                        <span className="text-[#303030] font-medium">
                          {park.deposit.toLocaleString("ru-RU")} руб.
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Комиссия</span>
                        <span className="text-[#303030] font-medium">{commission}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════ FEATURES GRID ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`${f.color} ${f.textColor} rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[220px]`}
              >
                <h3 className="text-xl md:text-2xl font-medium whitespace-pre-line leading-snug">
                  {f.title}
                </h3>
                <p className={`mt-4 text-sm leading-relaxed ${f.textColor === "text-white" ? "text-white/70" : "text-[#A1A1A1]"}`}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-12 md:py-16">
          <div className="bg-[#F8D62E] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl md:text-3xl font-medium text-[#303030] leading-snug">
                Зарегистрируйтесь сейчас и получите 100 баллов дружбы
                <span className="text-[#303030]/60"> на сервис «По делам, без 9%» и проверку в базе таксопарков</span>
              </h2>
              <p className="mt-3 text-sm text-[#303030]/60">
                2 простых шага — и вы получаете доступ ко всем инструментам сервиса.
              </p>
              <Button size="lg" className="mt-6" onClick={() => setAuthOpen(true)}>
                Зарегистрироваться
              </Button>
            </div>
            {/* Decorative aside — friendship points */}
            <div className="bg-white rounded-xl p-6 text-center shrink-0 w-full md:w-auto md:min-w-[240px]">
              <p className="text-3xl">💛</p>
              <p className="mt-2 text-sm font-medium text-[#303030]">&quot;Баллы дружбы&quot;</p>
              <p className="mt-1 text-xs text-[#A1A1A1] max-w-[200px] mx-auto">
                Копите баллы за активность и тратьте на сервисы платформы
              </p>
            </div>
          </div>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
