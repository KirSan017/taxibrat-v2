"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  // visibility flags after masking
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
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="h-8 w-60 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse mb-4" />
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-medium text-[#303030] mb-2">Парк не найден</h1>
        <p className="text-sm text-[#A1A1A1] mb-5">{error || "Проверьте ссылку"}</p>
        <Link href="/parks">
          <Button variant="outline">К списку</Button>
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
      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#A1A1A1] mb-6">
          <Link href="/parks" className="hover:text-[#303030] transition-colors">Таксопарки</Link>
          <span>/</span>
          <span className="text-[#303030]">{isNameHidden ? "Название скрыто" : parkName}</span>
        </nav>

        {/* ══════ HEADER ══════ */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl md:text-[32px] font-medium text-[#303030]">
                {isNameHidden ? (
                  <span className="flex items-center gap-2">
                    Название скрыто
                    <svg className="w-6 h-6 text-[#A1A1A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                ) : parkName}
              </h1>
              <Badge variant={isHighClass ? "yellow" : "gray"}>{classLabel}</Badge>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl md:text-[40px] font-medium text-[#303030]">{rating.toFixed(2)}</span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(rating) ? "text-[#F8D62E]" : "text-[#E5E5E5]"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="relative group">
                <svg
                  className="w-4 h-4 text-[#A1A1A1] cursor-help"
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
                <div className="pointer-events-none absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#303030] text-white text-xs leading-relaxed rounded-lg shadow-lg z-20">
                  Рейтинг основан на всех параметрах таксопарка и цене всех автомобилей этого класса в сравнении с другими таксопарками, при этом каждый параметр имеет свой вес.
                </div>
              </div>
            </div>

            {/* Address */}
            <p className="text-sm text-[#A1A1A1]">
              {isAddressHidden || !parkAddress ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Адрес скрыт
                </span>
              ) : parkAddress}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button
              size="lg"
              onClick={() => requireAuth(createRentTicket)}
              disabled={submitting}
            >
              {submitting ? "Отправка..." : "Взять в аренду"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => requireAuth(() => setReportOpen(true))}
            >
              Неверная информация
            </Button>
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
            {!user && !showAllParams && (
              <div className="absolute inset-0 top-[50%] flex items-center justify-center rounded-b-xl overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60" />
                <div className="relative text-center">
                  <svg className="w-8 h-8 text-[#A1A1A1] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm font-medium text-[#303030]">Зарегистрируйтесь для просмотра</p>
                  <p className="text-xs text-[#A1A1A1] mt-1">Полные данные доступны авторизованным пользователям</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => setAuthOpen(true)}
                  >
                    Войти / регистрация
                  </Button>
                </div>
              </div>
            )}
          </div>

          {user && parkParams.length > 8 && (
            <button
              onClick={() => setShowAllParams(!showAllParams)}
              className="mt-3 text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors"
            >
              {showAllParams ? "Скрыть" : `Показать все (${parkParams.length})`}
            </button>
          )}
        </section>

        {/* ══════ VEHICLES ══════ */}
        <section className="mb-12">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Автомобили парка</h2>

          {vehicles.length === 0 ? (
            <p className="text-sm text-[#A1A1A1]">В парке сейчас нет автомобилей.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-white border border-[#E5E5E5] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-[#303030]">
                      {v.brandName} {v.modelName} {v.year}
                    </h3>
                    <Badge variant={v.isAvailable ? "green" : "red"}>
                      {v.isAvailable ? "Свободен" : "Занят"}
                    </Badge>
                  </div>
                  <p className="text-lg font-medium text-[#303030]">
                    {v.rentPrice.toLocaleString("ru-RU")} руб./сут.
                  </p>
                </div>
              ))}
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
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 md:p-8">
            <button
              onClick={() => !submitting && setReportOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#A1A1A1] hover:text-[#303030] transition-colors"
              aria-label="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-medium text-[#303030] mb-1">Неверная информация</h3>
            <p className="text-sm text-[#A1A1A1] mb-3">
              Опишите, что именно требует уточнения. Мы передадим заявку менеджеру.
            </p>
            <div className="mb-5 rounded-lg bg-[#FFF8D6] border border-[#F8D62E]/60 px-4 py-3">
              <p className="text-xs text-[#303030] leading-relaxed">
                За каждую успешную проверку начисляется{" "}
                <span className="font-medium">150 баллов дружбы</span>.
              </p>
            </div>

            <textarea
              className="w-full min-h-[120px] p-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-y"
              placeholder="Например: указан неверный залог / комиссия"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              disabled={submitting}
            />

            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReportOpen(false)}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={submitReport}
                disabled={submitting || !reportText.trim()}
              >
                {submitting ? "Отправка..." : "Отправить"}
              </Button>
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
