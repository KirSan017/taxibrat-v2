"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

interface PublicStats {
  users: number;
  parks: number;
  no9Orders: number;
  buyoutCars: number;
}

/* ── Feature cards config (exact Figma colors) ──────────── */

interface FeatureCard {
  bg: string;
  heading: React.ReactNode;
  textColor: string;
  steps: string[];
  stepTextColor: string;
  promo?: React.ReactNode;
  pills?: React.ReactNode;
  button: { text: string; href?: string; onClick?: boolean; bg: string; color: string };
  image: string;
  badge?: React.ReactNode;
}

const DEFAULT_FEATURES = (): FeatureCard[] => [
  {
    bg: "bg-[#1F1F1F]",
    heading: (
      <>
        Получите заказ «По&nbsp;делам» в&nbsp;любом месте{" "}
        <span className="text-[#F8D62E]">за 2&nbsp;мин, без&nbsp;9%</span>
      </>
    ),
    textColor: "text-white",
    stepTextColor: "text-white",
    steps: [
      "Укажите точки А и Б, класс такси",
      "Вызовем ваше такси за 2 мин",
      "Выполните заказ или повысьте спрос",
    ],
    promo: (
      <p className="text-[14px] leading-[22px] text-[#F8D62E] max-w-[300px]">
        Выполнив заказ — получите 5 звезд и промокод на 6&nbsp;часов без комиссии!
      </p>
    ),
    button: {
      text: "Вызвать такси",
      href: "/no9",
      bg: "bg-white",
      color: "text-black",
    },
    image: "/figma/feature-no9.png",
  },
  {
    bg: "bg-[#3BB560]",
    heading: (
      <>
        Выкуп
        <br />
        автомобилей
      </>
    ),
    textColor: "text-white",
    stepTextColor: "text-white",
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
      color: "text-black",
    },
    image: "/figma/feature-buyout.png",
  },
  {
    bg: "bg-[#F8D62E]",
    heading: (
      <>
        Проверка по&nbsp;базе
        <br />
        таксопарков
      </>
    ),
    textColor: "text-[#303030]",
    stepTextColor: "text-[#303030]",
    steps: [
      "Отправьте запрос на проверку (10 секунд)",
      "Дадим ответ в течении 1 часа",
      "Проконсультируем в непростых ситуациях",
    ],
    button: {
      text: "Проверить по базе",
      onClick: true,
      bg: "bg-white",
      color: "text-black",
    },
    image: "/figma/feature-check.png",
  },
  {
    bg: "bg-[#F2F2F2]",
    heading: (
      <>
        Подключим
        <br />
        вас к&nbsp;такси
      </>
    ),
    textColor: "text-[#303030]",
    stepTextColor: "text-[#303030]",
    steps: [],
    pills: (
      <div className="flex flex-col gap-[11px] items-start mt-[10px]">
        <span className="inline-flex items-center h-[46px] px-[24px] bg-[#3BB560] text-white text-[16px] md:text-[19px] font-semibold rounded-[10px]">
          Комиссия — 1,5%
        </span>
        <span className="inline-flex items-center h-[46px] px-[24px] bg-[#F8D62E] text-[#303030] text-[16px] md:text-[19px] font-semibold rounded-[10px]">
          Вывод — моментальный
        </span>
      </div>
    ),
    button: {
      text: "Подключиться",
      onClick: true,
      bg: "bg-white",
      color: "text-black",
    },
    badge: (
      <span className="absolute left-[112px] top-[21px] z-10 inline-flex h-[29px] w-[79px] rotate-[-14.41deg] items-center justify-center rounded-[20px] bg-[#F8D62E] px-[11px] pb-[6px] pt-[5px] text-[14px] font-medium leading-[18px] text-[#303030]">
        за 2&nbsp;мин
      </span>
    ),
    image: "/figma/feature-connect.png",
  },
];

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
  const parksScrollerRef = useRef<HTMLDivElement>(null);

  const scrollParks = (dir: "left" | "right") => {
    const el = parksScrollerRef.current;
    if (!el) return;
    const card = 335 + 20; // card width + gap
    el.scrollBy({ left: dir === "right" ? card : -card, behavior: "smooth" });
  };

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
      {/* ══════ HERO — dark #1F1F1F per Figma ══════ */}
      <section className="bg-[#1F1F1F] relative overflow-hidden md:h-[642px]">
        <div className="relative max-w-[1600px] mx-auto h-full px-[24px] md:px-[100px] pt-[80px] pb-[60px] md:pt-0 md:pb-0">
          <div className="hidden md:block absolute w-[1078px] h-[852px] left-[253px] top-[473px] bg-[#575757] blur-[200px]" />
          <div className="grid md:block gap-10 items-center">
            {/* Left — headline, desc, CTA */}
            <div className="relative z-10 max-w-[690px] md:absolute md:left-[100px] md:top-[106px] md:w-[690px]">
              <p className="text-[16px] md:text-[20px] font-medium text-[#F8D62E] leading-[26px]">
                Сервис для каждого таксиста
              </p>
              <h1 className="mt-[30px] text-[40px] md:text-[60px] leading-[1.08] md:leading-[60px] font-medium text-white tracking-[-0.02em]">
                Выбери лучший таксопарк у&nbsp;себя на районе{" "}
                <span className="text-[#F8D62E]">за 2&nbsp;минуты</span>
              </h1>
              <p className="mt-[30px] text-[14px] leading-[22px] font-normal tracking-[-0.01em] text-white max-w-[416px]">
                Мы ваш верный спутник помощи работы в&nbsp;такси, проходите проверки на&nbsp;баны, влияйте на&nbsp;рейтинг таксопарков. А&nbsp;так&nbsp;же зарабатывайте «баллы дружбы» и&nbsp;тратьте их на&nbsp;платные фишки нашего сервиса
              </p>
              <div className="relative mt-[32px] h-[49px] w-[219px] md:mt-[40px]">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex h-[49px] w-[219px] items-center justify-center rounded-[10px] bg-white px-[40px] text-[14px] font-medium leading-[18px] text-black transition-colors hover:bg-white/90"
                >
                  Зарегистрироваться
                </button>
                <span className="absolute left-[129px] top-[28px] z-10 inline-flex h-[29px] w-[105px] rotate-[-14.41deg] items-center justify-center rounded-[20px] bg-[#F8D62E] px-[11px] pb-[6px] pt-[5px] text-[14px] font-medium leading-[18px] text-[#303030]">
                  всего 10&nbsp;сек
                </span>
              </div>
            </div>

            {/* Right — BIG illustration with counter overlay, extends outside container */}
            <div className="relative z-10 mt-[56px] w-full md:mt-0 md:absolute md:left-[741px] md:top-[54px] md:w-[859px]">
              {/* Counter overlay (Figma: 287x118 @ top-left corner) */}
              <div className="absolute left-[-18px] top-[52px] z-20 hidden h-[118px] w-[287px] rounded-[20px] bg-[#F8D62E] px-[40px] pt-[18px] md:block">
                <div className="text-[60px] font-medium leading-[60px] text-[#303030] tracking-tight">
                  {publicStats ? publicStats.users.toLocaleString("ru-RU") : "143 125"}
                </div>
                <div className="mt-0 text-[14px] leading-[22px] font-normal tracking-[-0.01em] text-[#303030]">
                  пользователей уже с&nbsp;нами
                </div>
              </div>
              <Image
                src="/figma/hero.png"
                alt=""
                width={2123}
                height={1039}
                priority
                className="w-full h-auto relative z-10"
              />
            </div>

            <div className="hidden md:block absolute left-[1321px] top-[124px] z-20 w-[222px] rounded-[15px] bg-white px-[20px] py-[15px] text-[11px] leading-[16px] tracking-[-0.01em] text-[#303030]">
              «Таксибрат дал заказ и я получил промокод на 6 часов без комиссии, крутая фишка, спасибо!»
            </div>
            <div className="hidden md:block absolute left-[1109px] top-[235px] z-20 w-[202px] rounded-[15px] bg-white px-[20px] py-[15px] text-[11px] leading-[16px] tracking-[-0.01em] text-[#303030]">
              «Спасибо Таксибрату, что помог создать повышенной спрос»
            </div>
            <div className="hidden md:block absolute left-[1182px] top-[466px] z-20 w-[230px] rounded-[15px] bg-white px-[20px] py-[15px] text-[11px] leading-[16px] tracking-[-0.01em] text-[#303030]">
              Таксопарк придрался к маленькой точке на бампере и снял 10 000 руб. Спасибо таксибрату, что помог!
            </div>
          </div>
        </div>
      </section>

      {/* ══════ BANNER (configurable 1400x400) ══════ */}
      {bannerUrl && (
        <section className="bg-white">
          <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[40px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt="Баннер"
              className="w-full h-auto rounded-[20px] object-cover"
              style={{ aspectRatio: "1400/400" }}
            />
          </div>
        </section>
      )}

      {/* ══════ PARKS SLIDER — 148 stat + cards ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[100px] pb-[80px] md:pb-[90px]">
          {/* Stats row */}
          <div className="flex flex-col md:flex-row md:items-center gap-[32px] md:gap-0 mb-[40px] md:mb-[39px]">
            <div className="flex items-center gap-[30px] md:gap-[30px] flex-1">
              <span className="md:w-[227px] md:shrink-0 text-[90px] md:text-[139px] font-medium leading-[0.85] text-[#F8D62E] tracking-[-0.04em]">
                {publicStats?.parks ?? 148}
              </span>
              <p className="text-[24px] md:text-[50px] font-medium text-[#303030] leading-[1.1] tracking-[-0.02em] max-w-[600px]">
                Таксопарков проверено<br className="hidden md:block" /> в&nbsp;Москве и&nbsp;МО
              </p>
            </div>
            <div className="flex items-center gap-[20px]">
              {/* CTA с встроенной стрелкой */}
              <Link
                href="/parks"
                className="inline-flex items-center h-[49px] pl-[40px] pr-[7px] gap-[12px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[14px] font-medium hover:bg-[#F8D62E]/90 transition-colors"
              >
                <span>Подобрать лучший</span>
                <span className="inline-flex items-center justify-center w-[35px] h-[35px] rounded-[7px] bg-[#303030] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
              {/* Карусель: круглые серые стрелки */}
              <div className="hidden md:flex items-center gap-[10px]">
                <button
                  type="button"
                  aria-label="Предыдущий"
                  onClick={() => scrollParks("left")}
                  className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#EFEFEF] text-[#A1A1A1] hover:bg-[#E5E5E5] hover:text-[#303030] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Следующий"
                  onClick={() => scrollParks("right")}
                  className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#EFEFEF] text-[#A1A1A1] hover:bg-[#E5E5E5] hover:text-[#303030] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Park cards horizontal scroll (335x362 each, r=20, gap 20) */}
          {parksLoading ? (
            <div className="flex gap-[20px] overflow-x-auto -mx-6 px-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex-none w-[335px] h-[362px] rounded-[20px] bg-[#FAFAFA] animate-pulse"
                />
              ))}
            </div>
          ) : parks.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#A1A1A1]">
              Пока нет парков в каталоге
            </div>
          ) : (
            <div ref={parksScrollerRef} className="flex gap-[20px] overflow-x-auto -mx-6 px-6 md:-mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide scroll-smooth">
              {parks.map((park) => {
                const rating = typeof park.rating === "string" ? parseFloat(park.rating) : park.rating;
                const commission = typeof park.parkCommission === "string" ? parseFloat(park.parkCommission) : park.parkCommission;
                const displayName = park.nameHidden || !park.parkName ? "Название скрыто" : park.parkName;
                const isBusinessClass = park.driverClass === "BUSINESS" || park.driverClass === "COMFORT_PLUS" || park.driverClass === "PREMIER" || park.driverClass === "ELITE";
                return (
                  <Link
                    key={park.id}
                    href={`/parks/${park.id}`}
                    className="flex-none w-[335px] h-[362px] snap-start bg-white border border-[#F7F7F7] rounded-[20px] hover:shadow-md transition-shadow relative overflow-hidden shadow-[0_20px_30px_rgba(0,0,0,0.04)]"
                  >
                    {/* Card layout */}
                    <div className="absolute left-[30px] top-[30px] flex h-[28px] w-[192px] items-center justify-between">
                      <div className="flex items-center gap-[2px]">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-[28px] h-[28px] ${i < Math.round(rating) ? "text-[#F8D62E]" : "text-[#F2F2F2]"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[20px] font-medium text-[#303030] leading-[26px]">{rating.toFixed(2)}</span>
                    </div>
                    {/* Name + class */}
                    <div className="absolute left-[30px] top-[68px] flex h-[34px] items-center gap-[10px]">
                      <Image
                        src="/figma/logo-icon.png"
                        alt=""
                        width={34}
                        height={34}
                        className="h-[34px] w-[34px] rounded-full"
                      />
                      <h3 className="max-w-[80px] truncate text-[20px] font-medium leading-[26px] text-[#303030]">{displayName}</h3>
                      <Badge
                        variant={isBusinessClass ? "yellow" : "gray"}
                        className="h-[11px] min-w-[54px] rounded-[10px] px-[5px] py-0 text-[8px] font-normal leading-[10px]"
                      >
                        {classLabel(park.driverClass)}
                      </Badge>
                    </div>
                    {/* Details list */}
                    <div className="absolute left-[30px] top-[122px] w-[275px] text-[13px] leading-[17px] text-[#A2A2A2]">
                      <div className="flex h-[29px] items-start justify-between border-b border-[#F7F7F7]">
                        <span className="max-w-[180px] truncate text-[#3BB560]">
                          {rating.toFixed(2)} {classLabel(park.driverClass)}
                        </span>
                        <span className="text-right">{park.deposit.toLocaleString("ru-RU")} руб</span>
                      </div>
                      <div className="flex h-[39px] items-center justify-between border-b border-[#F7F7F7]">
                        <span>Комиссия таксопарка</span>
                        <span>{commission}%</span>
                      </div>
                      <div className="flex h-[27px] items-end justify-between">
                        <span>Залог</span>
                        <span className="text-right">
                          {park.deposit.toLocaleString("ru-RU")} руб
                        </span>
                      </div>
                    </div>
                    <div className="absolute left-[30px] top-[235px] h-[44px] w-[115px] rounded-[10px] bg-[#FAFAFA] px-[15px] py-[7px]">
                      <div className="text-[10px] leading-[13px] text-[#D1D0D0]">Обновлено</div>
                      <div className="text-[13px] leading-[17px] text-[#A2A2A2]">26.02.25</div>
                    </div>
                    <div className="absolute left-[150px] top-[235px] h-[44px] w-[155px] rounded-[10px] bg-[#FAFAFA] px-[15px] py-[7px]">
                      <div className="truncate text-[10px] leading-[13px] text-[#D1D0D0]">Спасибо за обновление</div>
                      <div className="truncate text-[13px] leading-[17px] text-[#A2A2A2]">Таксибрат</div>
                    </div>
                    <button
                      type="button"
                      className="absolute left-[30px] top-[283.61px] h-[42px] w-[275px] rounded-[10px] bg-[#303030] text-[14px] font-medium leading-[18px] tracking-[-0.01em] text-white hover:bg-[#303030]/90 transition-colors"
                    >
                      Подробнее
                    </button>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="hidden md:block mt-[50px] h-[20px] w-full rounded-full bg-[#F2F2F2]">
            <div className="h-[20px] w-[190px] rounded-full bg-[#B0B0B0]" />
          </div>
        </div>
      </section>

      {/* ══════ FEATURES GRID 2x2 (4 cards 690x442, gap 20) ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pb-[20px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            {DEFAULT_FEATURES().map((f, i) => {
              const btnContent = (
                <button
                  type="button"
                  onClick={f.button.onClick ? () => setAuthOpen(true) : undefined}
                  className={`inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] text-[14px] font-medium ${f.button.bg} ${f.button.color} hover:opacity-90 transition-opacity`}
                >
                  {f.button.text}
                </button>
              );
              return (
                <div
                  key={i}
                  className={`${f.bg} ${f.textColor} rounded-[20px] p-[30px] md:p-[50px] h-[442px] relative overflow-hidden`}
                >
                  <div className={`relative z-10 ${i === 0 ? "max-w-[486px]" : "max-w-[60%]"}`}>
                    <h3 className="text-[22px] md:text-[34px] font-semibold leading-[1.12] tracking-[-0.01em]">
                      {f.heading}
                    </h3>
                    {f.steps.length > 0 && (
                      <ol className={`mt-[20px] space-y-[2px] text-[14px] leading-[22px] ${f.stepTextColor}`}>
                        {f.steps.map((s, idx) => (
                          <li key={idx}>{idx + 1} — {s}</li>
                        ))}
                      </ol>
                    )}
                    {f.promo && <div className="mt-[20px]">{f.promo}</div>}
                    {f.pills && f.pills}
                  </div>
                  <div className="absolute bottom-[30px] left-[30px] z-10 flex h-[49px] min-w-[219px] items-center md:bottom-[50px] md:left-[50px]">
                    {f.button.href ? (
                      <Link href={f.button.href}>{btnContent}</Link>
                    ) : (
                      btnContent
                    )}
                    {f.badge && f.badge}
                  </div>
                  <Image
                    src={f.image}
                    alt=""
                    width={640}
                    height={640}
                    className="absolute bottom-0 right-0 w-[180px] md:w-[340px] h-auto object-contain pointer-events-none select-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ CTA BOTTOM (yellow 1400x442, r=20, pad 50) ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pb-[50px]">
          <div className="bg-[#F8D62E] rounded-[20px] p-[30px] md:p-[50px] grid md:grid-cols-[1fr_401px] gap-[30px] md:gap-[125px] items-start md:h-[442px] overflow-hidden">
            {/* Left */}
            <div>
              <h2 className="text-[24px] md:text-[34px] font-semibold leading-[1.25] text-[#303030] tracking-[-0.01em] max-w-[658px]">
                Зарегистрируйтесь сейчас и&nbsp;получите{" "}
                <span className="text-[#303030]">100&nbsp;баллов дружбы</span>{" "}
                <span className="text-white">на&nbsp;заказ «По&nbsp;делам, без&nbsp;9%» и&nbsp;проверку в&nbsp;базе таксопарков</span>
              </h2>
              <p className="mt-[20px] text-[13px] md:text-[14px] leading-[22px] text-[#303030] max-w-[529px]">
                Со&nbsp;временем количество баллов для новых участников будет уменьшаться.
              </p>
              {pointsReview.enabled && pointsReview.date && (
                <div className="mt-[12px] inline-flex items-center gap-[7px] text-[14px] text-[#303030]">
                  <span>Следующее уменьшение</span>
                  <span className="inline-flex items-center h-[30px] px-[10px] bg-[#FA6868] text-white text-[14px] font-semibold rounded-[10px]">
                    {pointsReview.date}
                  </span>
                </div>
              )}
              <div className="mt-[30px] md:mt-[40px] flex gap-[10px]">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-[#303030] text-white text-[14px] font-medium hover:bg-[#303030]/90 transition-colors"
                >
                  Зарегистрироваться
                </button>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-colors"
                >
                  Войти
                </button>
              </div>
            </div>
            {/* Right — dark points card (401x318 r=20 pad 30) */}
            <div className="bg-[#303030] rounded-[20px] p-[30px] w-full md:w-[401px]">
              <div className="w-[40px] h-[40px] rounded-full bg-white/10 flex items-center justify-center mb-[15px]">
                <svg className="w-[22px] h-[22px] text-[#F8D62E]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <p className="text-[20px] leading-[26px] font-medium text-[#F8D62E] mb-[15px]">
                Как получить «баллы дружбы»?
              </p>
              <ul className="space-y-[6px] text-[14px] leading-[22px] text-white">
                <li>Зарегистрируйтесь — 100&nbsp;б</li>
                <li>Приведите друга — 200&nbsp;б вам и&nbsp;100&nbsp;б другу</li>
                <li>Отправили на&nbsp;проверку таксопарк — 200&nbsp;баллов</li>
                <li>Подключились к&nbsp;такси — 150&nbsp;баллов</li>
                <li>Взяли такси в&nbsp;аренду себе или другу — 300&nbsp;баллов</li>
                <li>Взяли авто в&nbsp;выкуп себе или другу — 1000&nbsp;баллов</li>
              </ul>
            </div>
          </div>

          {pointsReview.enabled && !pointsReview.date && (
            <div className="mt-[20px] bg-[#FFF8D6] border border-[#F8D62E] rounded-[16px] p-[16px] flex items-start gap-[12px]">
              <svg className="w-[20px] h-[20px] text-[#B8A033] shrink-0 mt-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              <p className="text-[14px] text-[#303030]">
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
