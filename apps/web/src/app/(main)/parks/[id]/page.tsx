"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SuccessModal } from "@/components/ui/success-modal";
import { AuthModal } from "@/components/auth/auth-modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { getAccessToken } from "@/lib/auth";
import { DRIVER_CLASS_LABELS } from "@/lib/labels";

interface ApiVehicle {
  id: string;
  brandName: string;
  modelName: string;
  year: number;
  rentPrice: number;
  isAvailable: boolean;
  priceRating: string | number | null;
  totalRating: string | number | null;
}

interface ApiPark {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string;
  district: string | null;
  isAdvertised: boolean;
  isSuperAdvertised: boolean;
  rating: string | number;
  status: string;
}

interface ApiClassDetail {
  id: string;
  parkId: string;
  driverClass: string;
  parkCommission: string | number;
  withdrawalCommission: string | number;
  transferCommission: string | number;
  deposit: number;
  depositReturnDays: number;
  latePenalty: number;
  trafficFinePenalty: number;
  terminationDays: number;
  contractFairness: number;
  contractMatch: number;
  daysOff: number;
  newDriverPromoDays: string | number;
  maxPromoDaysInClass: string | number;
  replacementCar: number;
  insurance: number;
  inspectionFreq: number;
  maintenanceDay: number;
  extraScratch: number;
  repairDowntime: number;
  selfRepair: number;
  repairPricing: number;
  rating: string | number;
  paramsRating: string | number | null;
  hasAvailableCars: boolean;
  park: ApiPark | null;
  vehicles: ApiVehicle[];
  parkName?: string | null;
  parkAddress?: string | null;
  parkPhone?: string | null;
  nameHidden?: boolean;
  addressHidden?: boolean;
  phoneHidden?: boolean;
  detailsBlurred?: boolean;
  isAdvertised?: boolean;
  isSuperAdvertised?: boolean;
  error?: string;
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

export default function ParkDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<ApiClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllParams, setShowAllParams] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ title: string; description: string; href?: string } | null>(null);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    setError("");
    api<ApiClassDetail>(`/catalog/classes/${classId}`)
      .then((d) => {
        if (d?.error) {
          setError(d.error);
          setData(null);
        } else {
          setData(d);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const requireAuth = (fn: () => void) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    fn();
  };

  const createRentTicket = async () => {
    const token = getAccessToken();
    if (!token || !data) return;
    setSubmitting(true);
    try {
      const ticket = await api<{ id: string }>("/tickets", {
        method: "POST",
        token,
        body: {
          topic: "TAXI_CONNECT",
          relatedEntityType: "PARK_CLASS",
          relatedEntityId: data.id,
          body: "Хочу взять в аренду",
        },
      });
      setSuccess({
        title: "Заявка создана",
        description: "Менеджер свяжется с вами в чате заявки.",
        href: ticket?.id ? `/support/${ticket.id}` : "/support",
      });
    } catch (e: unknown) {
      setSuccess({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать заявку",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReport = async () => {
    if (!reportText.trim() || !data) return;
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const ticket = await api<{ id: string }>("/tickets", {
        method: "POST",
        token,
        body: {
          topic: "PARK_CHECK",
          relatedEntityType: "PARK_CLASS",
          relatedEntityId: data.id,
          body: reportText.trim(),
        },
      });
      setReportOpen(false);
      setReportText("");
      setSuccess({
        title: "Спасибо за обратную связь",
        description: "Мы проверим информацию и отреагируем в чате заявки.",
        href: ticket?.id ? `/support/${ticket.id}` : "/support",
      });
    } catch (e: unknown) {
      setSuccess({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось отправить заявку",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] py-[40px] md:py-[60px]">
        <div className="h-[32px] w-[240px] bg-[#FAFAFA] rounded animate-pulse mb-[24px]" />
        <div className="h-[160px] bg-[#FAFAFA] rounded-[20px] animate-pulse mb-[16px]" />
        <div className="h-[240px] bg-[#FAFAFA] rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] py-[80px] text-center">
        <h1 className="text-[24px] font-medium text-[#303030] mb-[8px]">Парк не найден</h1>
        <p className="text-[14px] text-[#A1A1A1] mb-[20px]">{error || "Проверьте ссылку"}</p>
        <Link
          href="/parks"
          className="inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] border border-[#303030] text-[#303030] text-[14px] font-medium hover:bg-[#303030] hover:text-white transition-colors"
        >
          К списку
        </Link>
      </div>
    );
  }

  const park = data.park;
  const parkName = data.parkName ?? park?.name ?? null;
  const parkAddress = data.parkAddress ?? park?.address ?? null;
  const isNameHidden = Boolean(data.nameHidden) || !parkName;
  const isAddressHidden = Boolean(data.addressHidden);
  const rating = toNum(data.rating);
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const classLabel = DRIVER_CLASS_LABELS[data.driverClass] ?? data.driverClass;
  const isHighClass =
    data.driverClass === "BUSINESS" ||
    data.driverClass === "COMFORT_PLUS" ||
    data.driverClass === "PREMIER" ||
    data.driverClass === "ELITE";

  const parkParams: Array<{ name: string; value: string }> = [
    { name: "Комиссия парка", value: `${toNum(data.parkCommission)}%` },
    { name: "Залог", value: `${data.deposit.toLocaleString("ru-RU")} руб.` },
    { name: "Возврат залога", value: `${data.depositReturnDays} дн.` },
    { name: "Комиссия на вывод", value: `${toNum(data.withdrawalCommission)}%` },
    { name: "Комиссия на перевод", value: `${toNum(data.transferCommission)}%` },
    { name: "Штраф за простой", value: `${data.latePenalty.toLocaleString("ru-RU")} руб.` },
    { name: "Штраф за нарушения ПДД", value: `${data.trafficFinePenalty.toLocaleString("ru-RU")} руб.` },
    { name: "Расторжение договора", value: `${data.terminationDays} дн.` },
    { name: "Честность договора", value: `${data.contractFairness}/5` },
    { name: "Соответствие договора", value: `${data.contractMatch}/5` },
    { name: "Выходные", value: `${data.daysOff}/5` },
    { name: "Промо для новых (дн.)", value: String(toNum(data.newDriverPromoDays)) },
    { name: "Макс. промо в классе (дн.)", value: String(toNum(data.maxPromoDaysInClass)) },
    { name: "Подменный автомобиль", value: `${data.replacementCar}/5` },
    { name: "Страхование", value: `${data.insurance}/5` },
    { name: "Частота ТО", value: `${data.inspectionFreq}/5` },
    { name: "День обслуживания", value: `${data.maintenanceDay}/5` },
    { name: "Мелкие царапины", value: `${data.extraScratch}/5` },
    { name: "Простой при ремонте", value: `${data.repairDowntime}/5` },
    { name: "Самостоятельный ремонт", value: `${data.selfRepair}/5` },
    { name: "Стоимость ремонта", value: `${data.repairPricing}/5` },
  ];

  const visibleParams = showAllParams ? parkParams : parkParams.slice(0, 8);

  return (
    <>
      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[30px] md:pt-[60px] pb-[40px] md:pb-[60px]">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-[8px] text-[13px] text-[#A1A1A1] mb-[24px] md:mb-[40px]">
          <Link href="/parks" className="hover:text-[#303030] transition-colors">
            Таксопарки
          </Link>
          <span>/</span>
          <span className="text-[#303030] truncate">
            {isNameHidden ? "Название скрыто" : parkName}
          </span>
        </nav>

        {/* ══════ HERO CARD — dark with key info ══════ */}
        <div className="bg-[#1F1F1F] rounded-[20px] p-[30px] md:p-[50px] mb-[30px] md:mb-[50px] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-[30px]">
            <div className="flex-1 min-w-0">
              {/* Class badge */}
              <div className="mb-[20px]">
                <span
                  className={`inline-flex items-center h-[37px] px-[16px] rounded-[10px] text-[13px] font-medium ${
                    isHighClass ? "bg-[#F8D62E] text-[#303030]" : "bg-white/10 text-white"
                  }`}
                >
                  {classLabel}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-[28px] md:text-[48px] font-medium text-white leading-[1.1] tracking-[-0.02em] mb-[24px]">
                {isNameHidden ? (
                  <span className="flex items-center gap-[12px]">
                    Название скрыто
                    <svg
                      className="w-[32px] h-[32px] text-white/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </span>
                ) : (
                  parkName
                )}
              </h1>

              {/* Rating + address */}
              <div className="flex flex-col gap-[16px]">
                <div className="flex items-center gap-[16px]">
                  <span className="text-[48px] md:text-[60px] font-medium text-[#F8D62E] leading-none tracking-[-0.02em]">
                    {rating.toFixed(2)}
                  </span>
                  <div className="flex flex-col gap-[6px]">
                    <div className="flex items-center gap-[2px]">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-[18px] h-[18px] ${i < Math.round(rating) ? "text-[#F8D62E]" : "text-white/20"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[12px] text-white/60">рейтинг парка</span>
                  </div>
                </div>
                <p className="text-[14px] text-white/70">
                  {isAddressHidden || !parkAddress ? (
                    <span className="inline-flex items-center gap-[8px]">
                      <svg
                        className="w-[16px] h-[16px]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Адрес скрыт
                    </span>
                  ) : (
                    parkAddress
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-[10px] shrink-0 lg:w-[280px]">
              <button
                onClick={() => requireAuth(createRentTicket)}
                disabled={submitting}
                className="inline-flex items-center justify-center h-[56px] px-[30px] rounded-[12px] bg-[#F8D62E] text-[#303030] text-[15px] font-medium hover:bg-[#F8D62E]/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Отправка..." : "Взять в аренду"}
              </button>
              <button
                onClick={() => requireAuth(() => setReportOpen(true))}
                className="inline-flex items-center justify-center h-[56px] px-[30px] rounded-[12px] bg-white/10 text-white text-[15px] font-medium hover:bg-white/20 transition-colors"
              >
                Неверная информация
              </button>
            </div>
          </div>
        </div>

        {/* ══════ PARAMETERS TABLE ══════ */}
        <section className="mb-[40px] md:mb-[60px]">
          <div className="flex items-center justify-between mb-[20px] md:mb-[30px]">
            <h2 className="text-[22px] md:text-[34px] font-semibold text-[#303030] tracking-[-0.01em]">
              Параметры парка
            </h2>
            {user && parkParams.length > 8 && (
              <button
                onClick={() => setShowAllParams(!showAllParams)}
                className="inline-flex items-center justify-center h-[42px] px-[20px] rounded-[10px] border border-[#EFEFEF] text-[#303030] text-[13px] font-medium hover:border-[#303030] transition-colors"
              >
                {showAllParams ? "Скрыть" : `Показать все (${parkParams.length})`}
              </button>
            )}
          </div>

          <div className="relative">
            <div className="bg-white border border-[#EFEFEF] rounded-[20px] overflow-hidden">
              {visibleParams.map((param, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-[24px] py-[18px] text-[14px] ${
                    i !== visibleParams.length - 1 ? "border-b border-[#EFEFEF]" : ""
                  }`}
                >
                  <span className="text-[#A1A1A1]">{param.name}</span>
                  <span className="font-medium text-[#303030]">{param.value}</span>
                </div>
              ))}
            </div>

            {/* Blur overlay for non-registered */}
            {!user && !showAllParams && (
              <div className="absolute inset-0 top-[50%] flex items-center justify-center rounded-b-[20px] overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60" />
                <div className="relative text-center px-[20px]">
                  <svg
                    className="w-[36px] h-[36px] text-[#A1A1A1] mx-auto mb-[12px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-[14px] font-medium text-[#303030]">
                    Зарегистрируйтесь для просмотра
                  </p>
                  <p className="text-[12px] text-[#A1A1A1] mt-[4px]">
                    Полные данные доступны авторизованным пользователям
                  </p>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="mt-[16px] inline-flex items-center justify-center h-[42px] px-[24px] rounded-[10px] bg-[#303030] text-white text-[13px] font-medium hover:bg-[#404040] transition-colors"
                  >
                    Войти / регистрация
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══════ VEHICLES ══════ */}
        <section className="mb-[40px] md:mb-[60px]">
          <h2 className="text-[22px] md:text-[34px] font-semibold text-[#303030] mb-[20px] md:mb-[30px] tracking-[-0.01em]">
            Автомобили парка
          </h2>

          {vehicles.length === 0 ? (
            <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[40px] text-center">
              <p className="text-[14px] text-[#A1A1A1]">В парке сейчас нет автомобилей.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
              {vehicles.map((v) => {
                const totalRatingNum =
                  v.totalRating == null
                    ? null
                    : typeof v.totalRating === "number"
                    ? v.totalRating
                    : Number(v.totalRating);
                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#EFEFEF] rounded-[20px] p-[24px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-[12px] mb-[16px]">
                      <h3 className="text-[15px] font-medium text-[#303030] leading-[1.3]">
                        {v.brandName} {v.modelName}
                        <br />
                        <span className="text-[#A1A1A1]">{v.year}</span>
                      </h3>
                      <Badge variant={v.isAvailable ? "green" : "red"}>
                        {v.isAvailable ? "Свободен" : "Занят"}
                      </Badge>
                    </div>
                    <p className="text-[22px] font-medium text-[#303030] tracking-[-0.01em]">
                      {v.rentPrice.toLocaleString("ru-RU")} ₽
                      <span className="text-[13px] text-[#A1A1A1] font-normal ml-[4px]">/ сут.</span>
                    </p>
                    {totalRatingNum != null && !Number.isNaN(totalRatingNum) && (
                      <div className="mt-[12px] flex items-center gap-[6px]">
                        <svg className="w-[14px] h-[14px] text-[#F8D62E]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-[13px] text-[#303030]">
                          {totalRatingNum.toFixed(2)}
                        </span>
                        <div className="relative group">
                          <svg
                            className="w-[14px] h-[14px] text-[#A1A1A1] cursor-help"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="pointer-events-none absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-[12px] bg-[#303030] text-white text-[11px] leading-[18px] rounded-[10px] shadow-lg z-20">
                            Итоговый рейтинг автомобиля складывается из:
                            <br />• рейтинга марки (средний по всем моделям)
                            <br />• рейтинга модели (средний по всем годам)
                            <br />• рейтинга класса авто (средний по таксопаркам)
                            <br />• рейтинга таксопарка (по параметрам и цене)
                            <br />
                            Каждый параметр имеет свой вес.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ══════ REPORT MODAL ══════ */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !submitting && setReportOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] w-full max-w-[480px] p-[24px] md:p-[32px]">
            <button
              onClick={() => !submitting && setReportOpen(false)}
              className="absolute top-[16px] right-[16px] w-[32px] h-[32px] flex items-center justify-center text-[#A1A1A1] hover:text-[#303030] transition-colors"
              aria-label="Закрыть"
            >
              <svg
                className="w-[20px] h-[20px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h3 className="text-[20px] font-medium text-[#303030] mb-[4px]">
              Неверная информация
            </h3>
            <p className="text-[13px] text-[#A1A1A1] mb-[16px]">
              Опишите, что именно требует уточнения. Мы передадим заявку менеджеру.
            </p>
            <div className="mb-[20px] rounded-[12px] bg-[#FFF8D6] border border-[#F8D62E]/60 px-[16px] py-[12px]">
              <p className="text-[12px] text-[#303030] leading-[18px]">
                За каждую успешную проверку начисляется{" "}
                <span className="font-medium">150 баллов дружбы</span>.
              </p>
            </div>

            <textarea
              className="w-full min-h-[140px] p-[14px] border border-[#EFEFEF] rounded-[12px] text-[14px] text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-y"
              placeholder="Например: указан неверный залог / комиссия"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              disabled={submitting}
            />

            <div className="mt-[20px] flex gap-[10px]">
              <button
                onClick={() => setReportOpen(false)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center h-[49px] rounded-[10px] border border-[#EFEFEF] text-[#303030] text-[14px] font-medium hover:border-[#303030] disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={submitReport}
                disabled={submitting || !reportText.trim()}
                className="flex-1 inline-flex items-center justify-center h-[49px] rounded-[10px] bg-[#303030] text-white text-[14px] font-medium hover:bg-[#404040] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <SuccessModal
        open={!!success}
        onClose={() => setSuccess(null)}
        title={success?.title ?? ""}
        description={success?.description}
        ctaLabel={success?.href ? "Открыть заявку" : "Ок"}
        onCta={() => {
          if (success?.href && typeof window !== "undefined") {
            window.location.href = success.href;
          } else {
            setSuccess(null);
          }
        }}
        secondaryLabel={success?.href ? "Закрыть" : undefined}
        onSecondary={() => setSuccess(null)}
      />
    </>
  );
}
