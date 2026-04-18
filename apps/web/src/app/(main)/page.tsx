"use client";

import Link from "next/link";
import Image from "next/image";
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

interface FeatureCard {
  bg: string;
  heading: React.ReactNode;
  textColor: string;
  steps: string[];
  stepTextColor: string;
  footer?: React.ReactNode;
  button: { text: string; href?: string; onClick?: boolean; bg: string; color: string };
  image: string;
}

const DEFAULT_FEATURES = (onAuth: () => void): FeatureCard[] => [
  {
    bg: "bg-[#1A1A1A]",
    heading: (
      <>
        Получите заказ «По делам»<br />
        в любом месте <span className="text-[#F8D62E]">за 2 мин, без 9%</span>
      </>
    ),
    textColor: "text-white",
    stepTextColor: "text-white/70",
    steps: [
      "Укажите точки А и Б, класс такси",
      "Вызовем ваше такси за 2 мин",
      "Выполните заказ или повысьте спрос",
    ],
    footer: (
      <p className="text-xs text-[#F8D62E] leading-relaxed max-w-[320px]">
        Выполни заказ — получи 5 звезд и промокод на 6 часов без комиссии!
      </p>
    ),
    button: {
      text: "Вызвать такси",
      href: "/no9",
      bg: "bg-white",
      color: "text-[#1A1A1A]",
    },
    image: "/figma/feature-no9.png",
  },
  {
    bg: "bg-[#2F9E4D]",
    heading: (
      <>
        Выкуп<br />автомобилей
      </>
    ),
    textColor: "text-white",
    stepTextColor: "text-white/80",
    steps: [
      "Выберите авто по параметрам",
      "Найдите лучшую цену и условия в городе",
      "Оставьте заявку",
      "Наш менеджер сопроводит вас до полного выкупа авто",
    ],
    button: {
      text: "Посмотреть авто",
      href: "/buyout",
      bg: "bg-white",
      color: "text-[#1A1A1A]",
    },
    image: "/figma/feature-buyout.png",
  },
  {
    bg: "bg-[#F8D62E]",
    heading: (
      <>
        Проверка по базе<br />таксопарков
      </>
    ),
    textColor: "text-[#1A1A1A]",
    stepTextColor: "text-[#1A1A1A]/70",
    steps: [
      "Отправьте запрос на проверку (10 секунд)",
      "Дадим ответ в течении 1 часа",
      "Проконсультируем в непростых ситуациях",
    ],
    button: {
      text: "Проверить по базе",
      onClick: true,
      bg: "bg-[#1A1A1A]",
      color: "text-white",
    },
    image: "/figma/feature-check.png",
  },
  {
    bg: "bg-[#EDEDED]",
    heading: (
      <>
        Подключим<br />вас к такси
      </>
    ),
    textColor: "text-[#1A1A1A]",
    stepTextColor: "text-[#1A1A1A]/70",
    steps: [],
    footer: (
      <div className="flex flex-col gap-2 items-start">
        <span className="inline-flex px-3 py-1.5 bg-[#2F9E4D] text-white text-xs font-medium rounded-md">
          Комиссия — 1,5%
        </span>
        <span className="inline-flex px-3 py-1.5 bg-[#F8D62E] text-[#1A1A1A] text-xs font-medium rounded-md">
          Вывод — моментальный
        </span>
      </div>
    ),
    button: {
      text: "Подключиться",
      onClick: true,
      bg: "bg-white",
      color: "text-[#1A1A1A]",
    },
    image: "/figma/feature-connect.png",
  },
];

interface PublicStats {
  users: number;
  parks: number;
  no9Orders: number;
  buyoutCars: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [parks, setParks] = useState<ParkClassItem[]>([]);
  const [parksLoading, setParksLoading] = useState(true);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [pointsReview, setPointsReview] = useState<{ enabled: boolean; date: string }>({
    enabled: false,
    date: "",
  });

  // Redirect authorized users to /dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    setParksLoading(true);
    api<ParkClassItem[]>("/catalog/homepage?limit=8")
      .then((data) => {
        if (!cancelled) setParks(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setParks([]);
      })
      .finally(() => {
        if (!cancelled) setParksLoading(false);
      });
    api<PublicStats>("/public/stats")
      .then((data) => {
        if (!cancelled) setPublicStats(data);
      })
      .catch(() => {
        /* silent */
      });
    api<{ url: string | null }>("/public/banner")
      .then((data) => {
        if (!cancelled) setBannerUrl(data?.url ?? null);
      })
      .catch(() => {
        /* silent */
      });
    api<{ enabled: boolean; date: string }>("/public/points-review")
      .then((data) => {
        if (!cancelled) setPointsReview(data ?? { enabled: false, date: "" });
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const classLabel = (cls: string) => DRIVER_CLASS_LABELS[cls] ?? cls;

  return (
    <>
      {/* ══════ HERO — dark bg per Figma ══════ */}
      <section className="bg-[#1A1A1A] relative overflow-hidden">
        <div className="relative max-w-[1600px] mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-12 items-center">
            {/* Left side */}
            <div className="max-w-2xl">
              <p className="text-xs md:text-sm text-[#F8D62E] mb-5 font-medium">
                Сервис для каждого таксиста
              </p>
              <h1 className="text-[36px] md:text-[56px] leading-[1.08] font-medium text-white tracking-tight">
                Выбери лучший таксопарк у себя на районе{" "}
                <span className="text-[#F8D62E]">за 2 минуты</span>
              </h1>
              <p className="mt-6 text-sm md:text-base text-white/60 max-w-md leading-relaxed">
                Мы вам верный спутник помощи работы в такси, проведем проверку на баны, влияете на рейтинг таксопарка. А так же зарабатывайте «баллы дружбы» и тратьте их на платные финансовые сервисы.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Button
                  size="lg"
                  onClick={() => setAuthOpen(true)}
                  className="!bg-white !text-[#1A1A1A] hover:!bg-white/90"
                >
                  Зарегистрироваться
                </Button>
                <div className="flex flex-col text-[10px] text-[#F8D62E] leading-tight ml-2">
                  <span>нужно</span>
                  <span>30 сек</span>
                </div>
              </div>
            </div>

            {/* Right side — hero illustration with overlays */}
            <div className="relative w-full">
              {/* Users counter overlay on hero */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-[#F8D62E] rounded-2xl px-5 md:px-6 py-3 md:py-4 shadow-lg">
                <div className="text-[32px] md:text-[44px] font-medium leading-none text-[#1A1A1A] tracking-tight">
                  {publicStats ? publicStats.users.toLocaleString("ru-RU") : "615"}
                </div>
                <div className="text-[10px] md:text-xs text-[#1A1A1A]/80 mt-1 font-medium">
                  пользователей с нами
                </div>
              </div>
              <Image
                src="/figma/hero.png"
                alt=""
                width={1718}
                height={1038}
                priority
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════ BANNER (configurable 1400x400) ══════ */}
      {bannerUrl && (
        <section className="bg-white">
          <div className="max-w-[1600px] mx-auto px-6 pt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt="Баннер"
              className="w-full h-auto rounded-2xl object-cover"
              style={{ aspectRatio: "1400/400" }}
            />
          </div>
        </section>
      )}

      {/* ══════ STATS + PARKS SLIDER ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 py-14 md:py-20">
          {/* Stats row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="flex items-start gap-5">
              <span className="text-[72px] md:text-[88px] font-medium leading-[0.9] text-[#F8D62E] tracking-tight">
                {publicStats?.parks ?? 148}
              </span>
              <p className="mt-3 text-lg md:text-xl font-medium text-[#303030] max-w-xs leading-snug">
                Таксопарков проверено
                <br />в Москве и МО
              </p>
            </div>
            <Link
              href="/parks"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#303030] hover:gap-3 transition-all"
            >
              Смотреть все
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
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
        <div className="max-w-[1600px] mx-auto px-6 pb-8 md:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_FEATURES(() => setAuthOpen(true)).map((f, i) => {
              const btnContent = (
                <button
                  type="button"
                  onClick={f.button.onClick ? () => setAuthOpen(true) : undefined}
                  className={`inline-flex items-center justify-center h-11 px-6 rounded-lg text-sm font-medium ${f.button.bg} ${f.button.color} hover:opacity-90 transition-opacity`}
                >
                  {f.button.text}
                </button>
              );
              return (
                <div
                  key={i}
                  className={`${f.bg} ${f.textColor} rounded-[24px] p-7 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden`}
                >
                  <div className="relative z-10 max-w-[60%]">
                    <h3 className="text-[22px] md:text-[28px] font-medium leading-[1.15]">
                      {f.heading}
                    </h3>
                    {f.steps.length > 0 && (
                      <ol className={`mt-5 space-y-1.5 text-[13px] leading-relaxed ${f.stepTextColor}`}>
                        {f.steps.map((s, idx) => (
                          <li key={idx}>{idx + 1} — {s}</li>
                        ))}
                      </ol>
                    )}
                    {f.footer && <div className="mt-5">{f.footer}</div>}
                  </div>
                  <div className="relative z-10 mt-6">
                    {f.button.href ? (
                      <Link href={f.button.href}>{btnContent}</Link>
                    ) : (
                      btnContent
                    )}
                  </div>
                  <Image
                    src={f.image}
                    alt=""
                    width={320}
                    height={320}
                    className="absolute bottom-0 right-0 w-[140px] md:w-[200px] h-auto object-contain pointer-events-none select-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 pb-12 md:pb-16">
          <div className="bg-[#F8D62E] rounded-[24px] p-8 md:p-12 grid md:grid-cols-[1.3fr_1fr] gap-8 md:gap-10">
            {/* Left side */}
            <div>
              <h2 className="text-[24px] md:text-[36px] leading-[1.2] font-medium text-[#1A1A1A]">
                Зарегистрируйтесь сейчас и получите{" "}
                <span className="text-[#1A1A1A]">100 баллов дружбы</span> на заказ{" "}
                «По&nbsp;делам, без 9%» и проверку в базе таксопарков
              </h2>
              <p className="mt-5 text-xs md:text-sm text-[#1A1A1A]/70 leading-relaxed max-w-lg">
                Со временем количество баллов для новых участников будет уменьшаться.
              </p>
              {pointsReview.enabled && pointsReview.date && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#1A1A1A]">
                  <span>Следующее уменьшение</span>
                  <span className="px-3 py-1 bg-[#FA6868] text-white rounded-full font-medium">
                    {pointsReview.date}
                  </span>
                </div>
              )}
              <div className="mt-8 flex gap-3">
                <Button
                  size="lg"
                  onClick={() => setAuthOpen(true)}
                  className="!bg-[#1A1A1A] !text-white hover:!bg-[#1A1A1A]/90"
                >
                  Зарегистрироваться
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setAuthOpen(true)}
                  className="!bg-white !border-white !text-[#1A1A1A] hover:!bg-white/90"
                >
                  Войти
                </Button>
              </div>
            </div>
            {/* Right side — dark card with points list */}
            <div className="bg-[#1A1A1A] rounded-[20px] p-6 md:p-8 text-white">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-[#F8D62E]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F8D62E]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium">Как получить «баллы дружбы»?</p>
              </div>
              <ul className="space-y-3 text-xs md:text-[13px] text-white/80">
                <li>Зарегистрируйтесь — <span className="text-white">100 б</span></li>
                <li>Приведите друга — <span className="text-white">200 б</span> вам и <span className="text-white">100 б</span> другу</li>
                <li>Отправили на проверку таксопарка — <span className="text-white">200 баллов</span></li>
                <li>Подключились к такси — <span className="text-white">150 баллов</span></li>
                <li>Взяли такси в аренду себе или другу — <span className="text-white">300 баллов</span></li>
                <li>Взяли авто в выкуп себе или другу — <span className="text-white">1000 баллов</span></li>
              </ul>
            </div>
          </div>

          {pointsReview.enabled && !pointsReview.date && (
            <div className="mt-4 bg-[#FFF8D6] border border-[#F8D62E] rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-[#B8A033] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              <p className="text-sm text-[#303030]">
                <span className="font-medium">Внимание!</span> В ближайшее время баллы дружбы будут пересмотрены в сторону уменьшения.
              </p>
            </div>
          )}
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
