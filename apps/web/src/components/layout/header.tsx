"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { AuthModal } from "../auth/auth-modal";
import { ConfirmModal } from "../ui/confirm-modal";
import { SuccessModal } from "../ui/success-modal";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

const FRIENDSHIP_POINTS_OFFSET = 615;

export function Header() {
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [taxiConnectOpen, setTaxiConnectOpen] = useState(false);
  const [baseCheckOpen, setBaseCheckOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState<{ title: string; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openAuth = () => {
    setMobileMenuOpen(false);
    setAuthOpen(true);
  };

  const handleMenuClick = (action: "taxi-connect" | "base-check") => (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (action === "taxi-connect") setTaxiConnectOpen(true);
    else setBaseCheckOpen(true);
  };

  const createTicket = async (topic: "TAXI_CONNECT" | "USER_BASE_CHECK", body: string) => {
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await api("/tickets", {
        method: "POST",
        token,
        body: { topic, body },
      });
      setResultOpen({
        title: "Заявка создана",
        description:
          topic === "TAXI_CONNECT"
            ? "Менеджер свяжется с вами в ближайшее время."
            : "Проверка начата. 50 баллов списаны. Результат появится в чате заявки.",
      });
    } catch (e: unknown) {
      setResultOpen({
        title: "Не удалось создать заявку",
        description: e instanceof Error ? e.message : "Попробуйте позже",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const balance = user
    ? (user.friendshipPoints ?? 0) + FRIENDSHIP_POINTS_OFFSET
    : 0;

  return (
    <>
      <header className="w-full border-b border-[#E5E5E5]">
        <div className="max-w-[1600px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <span className="text-2xl font-medium text-[#303030]">Таксибрат</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href={user ? "/dashboard" : "/"} className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Главная
            </Link>
            <Link href="/parks" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Таксопарки
            </Link>
            <Link href="/no9" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              По делам без 9%
            </Link>
            <button
              onClick={handleMenuClick("taxi-connect")}
              className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors"
            >
              Подключение к такси
            </button>
            <Link href="/buyout" className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors">
              Выкуп
            </Link>
            <button
              onClick={handleMenuClick("base-check")}
              className="text-sm font-medium text-[#303030] hover:text-[#A1A1A1] transition-colors"
            >
              Проверка по базе
            </button>
          </nav>

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-24 rounded bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F3F1E7]">
                  <span className="text-xs text-[#A1A1A1]">Баланс</span>
                  <span className="text-sm font-medium text-[#303030]">
                    {balance.toLocaleString("ru-RU")} б.
                  </span>
                </div>
                <Link
                  href="/notifications"
                  aria-label="Уведомления"
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E5E5] hover:bg-gray-50 transition-colors"
                >
                  <Bell className="w-4 h-4 text-[#303030]" />
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">ЛК</Button>
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors"
                  aria-label="Выйти"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
                  Войти
                </Button>
                <Button size="sm" onClick={() => setAuthOpen(true)}>
                  Регистрация
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#303030]" />
            ) : (
              <Menu className="w-6 h-6 text-[#303030]" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E5E5] bg-white">
            <nav className="flex flex-col p-4 gap-4">
              <Link href={user ? "/dashboard" : "/"} className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Главная</Link>
              <Link href="/parks" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Таксопарки</Link>
              <Link href="/no9" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>По делам без 9%</Link>
              <button onClick={handleMenuClick("taxi-connect")} className="text-sm font-medium text-left">
                Подключение к такси
              </button>
              <Link href="/buyout" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Выкуп</Link>
              <button onClick={handleMenuClick("base-check")} className="text-sm font-medium text-left">
                Проверка по базе
              </button>
              {user ? (
                <>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                    <span className="text-xs text-[#A1A1A1]">Баланс</span>
                    <span className="text-sm font-medium text-[#303030]">
                      {balance.toLocaleString("ru-RU")} б.
                    </span>
                  </div>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">В личный кабинет</Button>
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="text-sm text-[#A1A1A1] text-left"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={openAuth}>Войти</Button>
                  <Button size="sm" className="flex-1" onClick={openAuth}>Регистрация</Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <ConfirmModal
        open={taxiConnectOpen}
        onClose={() => setTaxiConnectOpen(false)}
        title="Подключение к такси"
        description="Создадим заявку — менеджер подберёт для вас лучший таксопарк. Продолжить?"
        confirmLabel={submitting ? "Отправка..." : "Да, создать"}
        cancelLabel="Отмена"
        onConfirm={() => createTicket("TAXI_CONNECT", "Хочу подключиться к такси")}
      />

      <ConfirmModal
        open={baseCheckOpen}
        onClose={() => setBaseCheckOpen(false)}
        variant="warning"
        title="Проверка по базе — 50 баллов"
        description="Проверим вашу историю работы в такси и внесём в базу проверенных водителей. С баланса будет списано 50 баллов дружбы."
        confirmLabel={submitting ? "Отправка..." : "Подтвердить"}
        cancelLabel="Отмена"
        onConfirm={() => createTicket("USER_BASE_CHECK", "Проверка по базе водителей")}
      />

      <SuccessModal
        open={!!resultOpen}
        onClose={() => setResultOpen(null)}
        title={resultOpen?.title ?? ""}
        description={resultOpen?.description}
        ctaLabel="Ок"
      />
    </>
  );
}
