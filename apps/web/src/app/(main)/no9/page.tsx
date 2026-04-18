"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthModal } from "@/components/auth/auth-modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { getAccessToken } from "@/lib/auth";

const ORDER_COST = 50;

export default function No9Page() {
  const { user, loading: authLoading } = useAuth();
  const [pointFrom, setPointFrom] = useState("");
  const [pointTo, setPointTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const isLoggedIn = !!user;
  const isProfileComplete = user?.status === "ACTIVE";
  const hasEnoughPoints = (user?.friendshipPoints ?? 0) >= ORDER_COST;

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
      setError(`Недостаточно баллов (нужно ${ORDER_COST}).`);
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
    submitting ||
    authLoading ||
    !pointFrom.trim() ||
    !pointTo.trim();

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
            По делам, без 9%
          </h1>
          <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
            Закажите поездку напрямую у водителя без комиссии агрегатора. Оплата баллами дружбы — экономьте на каждой поездке.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        <div className="max-w-xl">
          {successOrderId ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-[#303030] mb-2">Заказ отправлен!</h2>
              <p className="text-sm text-[#A1A1A1] mb-6">
                Ожидайте, менеджер свяжется с вами в ближайшее время.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/orders">
                  <Button variant="outline">Мои заказы</Button>
                </Link>
                <Button
                  onClick={() => {
                    setSuccessOrderId(null);
                    setPointFrom("");
                    setPointTo("");
                  }}
                >
                  Новый заказ
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-medium text-[#303030] mb-6">Оформить заказ</h2>

              <div className="space-y-4 mb-6">
                <Input
                  label="Точка А"
                  placeholder="Откуда забрать (адрес)"
                  value={pointFrom}
                  onChange={(e) => setPointFrom(e.target.value)}
                />
                <Input
                  label="Точка Б"
                  placeholder="Куда ехать (адрес)"
                  value={pointTo}
                  onChange={(e) => setPointTo(e.target.value)}
                />
              </div>

              <div className="bg-[#F3F1E7] rounded-xl p-4 mb-6 flex items-center justify-between">
                <p className="text-sm text-[#303030]">
                  Стоимость: <span className="font-medium">{ORDER_COST} баллов дружбы</span>
                </p>
                {isLoggedIn && (
                  <p className="text-xs text-[#A1A1A1]">
                    Баланс: {user?.friendshipPoints?.toLocaleString("ru-RU") ?? 0} б.
                  </p>
                )}
              </div>

              {!authLoading && !isLoggedIn && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#FA6868]">
                    Войдите, чтобы заказать поездку
                  </p>
                </div>
              )}

              {isLoggedIn && !isProfileComplete && (
                <div className="bg-[#F8D62E]/20 border border-[#F8D62E]/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
                  <p className="text-sm text-[#303030]">
                    Заполните профиль для оформления заказа
                  </p>
                  <Link href="/profile">
                    <Button size="sm" variant="outline">В профиль</Button>
                  </Link>
                </div>
              )}

              {isLoggedIn && isProfileComplete && !hasEnoughPoints && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#FA6868]">
                    Недостаточно баллов дружбы. Нужно {ORDER_COST}.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#FA6868]">{error}</p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={formDisabled}
                onClick={handleSubmit}
              >
                {submitting ? "Отправка..." : "Заказать"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
