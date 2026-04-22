"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddressInput } from "@/components/ui/address-input";
import { MapPicker, type LatLng } from "@/components/ui/map-picker";
import { AuthModal } from "@/components/auth/auth-modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { getAccessToken } from "@/lib/auth";

interface PointsConfig {
  orderNo9Cost: number;
}

export default function No9Page() {
  const { user, loading: authLoading } = useAuth();
  const [orderCost, setOrderCost] = useState(50);
  const [pointFrom, setPointFrom] = useState("");
  const [pointTo, setPointTo] = useState("");
  const [pointFromCoords, setPointFromCoords] = useState<LatLng | null>(null);
  const [pointToCoords, setPointToCoords] = useState<LatLng | null>(null);
  const [activePoint, setActivePoint] = useState<"A" | "B">("A");
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const isLoggedIn = !!user;
  const isProfileComplete = user?.status === "ACTIVE";
  const hasEnoughPoints = (user?.friendshipPoints ?? 0) >= orderCost;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setCurrentLocation(coords);
      },
      () => {},
      { maximumAge: 60_000, timeout: 5_000 },
    );
  }, []);

  useEffect(() => {
    api<PointsConfig>("/public/points-config")
      .then((c) => {
        if (typeof c?.orderNo9Cost === "number") setOrderCost(c.orderNo9Cost);
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    if (!isProfileComplete) {
      return;
    }
    if (!hasEnoughPoints) {
      setError(`Недостаточно баллов (нужно ${orderCost}).`);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setAuthOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const order = await api<{ id: string }>("/orders/no9", {
        method: "POST",
        token,
        body: { pointFrom: pointFrom.trim(), pointTo: pointTo.trim() },
      });
      setSuccessOrderId(order?.id ?? "ok");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось создать заказ");
    } finally {
      setSubmitting(false);
    }
  };

  const formDisabled =
    submitting || authLoading || !pointFrom.trim() || !pointTo.trim();

  return (
    <>
      {/* ══════ HERO — dark with big type ══════ */}
      <section className="bg-[#1F1F1F] relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[80px] pb-[50px] md:pt-[140px] md:pb-[80px]">
          <div className="max-w-[900px]">
            <p className="text-[16px] md:text-[20px] font-medium text-[#F8D62E] leading-[26px] mb-[16px] md:mb-[30px]">
              Заказ такси напрямую
            </p>
            <h1 className="text-[36px] md:text-[60px] leading-[1.08] font-medium text-white tracking-[-0.02em]">
              По делам,{" "}
              <span className="text-[#F8D62E]">без&nbsp;9%</span>
            </h1>
            <p className="mt-[20px] md:mt-[30px] text-[14px] md:text-[16px] leading-[24px] text-white/75 max-w-[580px]">
              Закажите поездку напрямую у&nbsp;водителя без&nbsp;комиссии агрегатора.
              Оплата баллами дружбы — экономьте на&nbsp;каждой поездке.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[40px] md:pt-[60px] pb-[40px] md:pb-[80px]">
        {successOrderId ? (
          <div className="max-w-[580px] mx-auto">
            <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[40px] text-center">
              <div className="w-[72px] h-[72px] bg-[#3BB560]/10 rounded-full flex items-center justify-center mx-auto mb-[20px]">
                <svg
                  className="w-[36px] h-[36px] text-[#3BB560]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-[24px] md:text-[28px] font-medium text-[#303030] mb-[8px] tracking-[-0.01em]">
                Заказ отправлен!
              </h2>
              <p className="text-[14px] text-[#A1A1A1] mb-[30px] max-w-[420px] mx-auto">
                Ожидайте — менеджер свяжется с&nbsp;вами в&nbsp;ближайшее время.
              </p>
              <div className="flex flex-col sm:flex-row gap-[10px] justify-center">
                <Link
                  href="/orders"
                  className="inline-flex items-center justify-center h-[49px] px-[32px] rounded-[10px] border border-[#303030] text-[#303030] text-[14px] font-medium hover:bg-[#303030] hover:text-white transition-colors"
                >
                  Мои заказы
                </Link>
                <button
                  onClick={() => {
                    setSuccessOrderId(null);
                    setPointFrom("");
                    setPointTo("");
                    setPointFromCoords(null);
                    setPointToCoords(null);
                    setActivePoint("A");
                  }}
                  className="inline-flex items-center justify-center h-[49px] px-[32px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[14px] font-medium hover:bg-[#F8D62E]/90 transition-colors"
                >
                  Новый заказ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-[20px] md:gap-[30px]">
            {/* ─── form ─── */}
            <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[24px] md:p-[40px]">
              <h2 className="text-[20px] md:text-[28px] font-semibold text-[#303030] mb-[20px] md:mb-[30px] tracking-[-0.01em]">
                Оформить заказ
              </h2>

              <div className="space-y-[16px] mb-[20px]">
                <div onFocus={() => setActivePoint("A")}>
                  <AddressInput
                    label="Точка А"
                    placeholder="Откуда забрать (адрес)"
                    value={pointFrom}
                    onChange={setPointFrom}
                    onPick={(s) => {
                      if (s.geoLat != null && s.geoLon != null) {
                        setPointFromCoords([s.geoLat, s.geoLon]);
                        setActivePoint("B");
                      }
                    }}
                  />
                </div>
                <div onFocus={() => setActivePoint("B")}>
                  <AddressInput
                    label="Точка Б"
                    placeholder="Куда ехать (адрес)"
                    value={pointTo}
                    onChange={setPointTo}
                    onPick={(s) => {
                      if (s.geoLat != null && s.geoLon != null) {
                        setPointToCoords([s.geoLat, s.geoLon]);
                      }
                    }}
                  />
                </div>
                {currentLocation && !pointFrom && (
                  <button
                    type="button"
                    onClick={() => {
                      setPointFromCoords(currentLocation);
                      setPointFrom("Моё местоположение");
                      setActivePoint("B");
                    }}
                    className="inline-flex items-center gap-[6px] text-[12px] text-[#303030] underline hover:no-underline"
                  >
                    <svg
                      className="w-[14px] h-[14px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Использовать моё местоположение
                  </button>
                )}
              </div>

              {/* Cost */}
              <div className="bg-[#F3F1E7] rounded-[12px] p-[16px] md:p-[20px] mb-[20px] flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-[#A1A1A1] mb-[2px]">Стоимость заказа</p>
                  <p className="text-[18px] md:text-[22px] font-medium text-[#303030]">
                    {orderCost} <span className="text-[13px] text-[#A1A1A1] font-normal">баллов дружбы</span>
                  </p>
                </div>
                {isLoggedIn && (
                  <div className="text-right">
                    <p className="text-[12px] text-[#A1A1A1] mb-[2px]">Ваш баланс</p>
                    <p className="text-[14px] font-medium text-[#303030]">
                      {user?.friendshipPoints?.toLocaleString("ru-RU") ?? 0} б.
                    </p>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {!authLoading && !isLoggedIn && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-[12px] p-[16px] mb-[20px]">
                  <p className="text-[13px] text-[#FA6868]">
                    Войдите, чтобы заказать поездку
                  </p>
                </div>
              )}

              {isLoggedIn && !isProfileComplete && (
                <div className="bg-[#F8D62E]/20 border border-[#F8D62E]/40 rounded-[12px] p-[16px] mb-[20px] flex items-center justify-between gap-[12px]">
                  <p className="text-[13px] text-[#303030] flex-1">
                    Заполните профиль для оформления заказа
                  </p>
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center h-[36px] px-[16px] rounded-[8px] border border-[#303030] text-[#303030] text-[12px] font-medium hover:bg-[#303030] hover:text-white transition-colors shrink-0"
                  >
                    В профиль
                  </Link>
                </div>
              )}

              {isLoggedIn && isProfileComplete && !hasEnoughPoints && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-[12px] p-[16px] mb-[20px]">
                  <p className="text-[13px] text-[#FA6868]">
                    Недостаточно баллов дружбы. Нужно {orderCost}.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-[12px] p-[16px] mb-[20px]">
                  <p className="text-[13px] text-[#FA6868]">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={formDisabled}
                className="w-full inline-flex items-center justify-center h-[56px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[15px] font-medium hover:bg-[#F8D62E]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Отправка..." : "Заказать"}
              </button>
            </div>

            {/* ─── map ─── */}
            <div className="flex flex-col gap-[12px]">
              <div className="flex items-center gap-[12px] text-[12px] text-[#A1A1A1]">
                <span>Клик по карте —</span>
                <div className="inline-flex rounded-[10px] overflow-hidden border border-[#EFEFEF]">
                  <button
                    type="button"
                    onClick={() => setActivePoint("A")}
                    className={`inline-flex items-center h-[34px] px-[14px] text-[12px] font-medium transition-colors ${
                      activePoint === "A"
                        ? "bg-[#3BB560] text-white"
                        : "bg-white text-[#303030] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    Точка А
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePoint("B")}
                    className={`inline-flex items-center h-[34px] px-[14px] text-[12px] font-medium transition-colors ${
                      activePoint === "B"
                        ? "bg-[#FA6868] text-white"
                        : "bg-white text-[#303030] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    Точка Б
                  </button>
                </div>
              </div>
              <div className="rounded-[20px] overflow-hidden border border-[#EFEFEF]">
                <MapPicker
                  pointA={pointFromCoords}
                  pointB={pointToCoords}
                  onPointAChange={setPointFromCoords}
                  onPointBChange={setPointToCoords}
                  activePoint={activePoint}
                  height="560px"
                  autoLocate
                />
              </div>
              <p className="text-[11px] text-[#A1A1A1]">
                Подсказка: выберите нужную точку выше, затем кликните по карте. Маркеры можно перетаскивать.
              </p>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
