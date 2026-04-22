"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { AuthModal } from "../auth/auth-modal";
import { ConfirmModal } from "../ui/confirm-modal";
import { SuccessModal } from "../ui/success-modal";
import { Logo } from "./logo";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

interface PointsConfig {
  baseCheckCost: number;
}

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [taxiConnectOpen, setTaxiConnectOpen] = useState(false);
  const [baseCheckOpen, setBaseCheckOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState<{ title: string; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [baseCheckCost, setBaseCheckCost] = useState<number>(50);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setPendingTickets(0);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    api<{ unread: number }>("/notifications?page=1&limit=1", { token })
      .then((res) => setUnread(res.unread || 0))
      .catch(() => setUnread(0));
    // Count pending (NEW + IN_PROGRESS) user tickets
    Promise.all([
      api<{ total: number }>("/tickets?page=1&limit=1&status=NEW", { token }).catch(() => ({ total: 0 })),
      api<{ total: number }>("/tickets?page=1&limit=1&status=IN_PROGRESS", { token }).catch(() => ({ total: 0 })),
    ]).then(([a, b]) => setPendingTickets((a?.total || 0) + (b?.total || 0)));
  }, [user]);

  useEffect(() => {
    api<PointsConfig>("/public/points-config")
      .then((c) => {
        if (typeof c?.baseCheckCost === "number") setBaseCheckCost(c.baseCheckCost);
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

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
            : `Проверка начата. ${baseCheckCost} баллов списаны. Результат появится в чате заявки.`,
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

  const balance = user ? user.friendshipPoints ?? 0 : 0;
  // Dark hero on home page → transparent header with white text
  const isHome = pathname === "/";
  const headerBg = isHome ? "bg-[#1F1F1F]" : "bg-white border-b border-[#E5E5E5]";
  const navTextColor = isHome
    ? "text-white hover:text-[#F8D62E]"
    : "text-[#303030] hover:text-[#A1A1A1]";

  return (
    <>
      <header className={`w-full ${headerBg}`}>
        <div className="max-w-[1600px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Logo href={user ? "/dashboard" : "/"} size="md" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href={user ? "/dashboard" : "/"} className={`text-sm font-medium transition-colors ${navTextColor}`}>
              Главная
            </Link>
            <Link href="/parks" className={`text-sm font-medium transition-colors ${navTextColor}`}>
              Таксопарки
            </Link>
            <Link href="/no9" className={`text-sm font-medium transition-colors ${navTextColor}`}>
              По делам без 9%
            </Link>
            <button
              onClick={handleMenuClick("taxi-connect")}
              className={`text-sm font-medium transition-colors ${navTextColor}`}
            >
              Подключение к такси
            </button>
            <Link href="/buyout" className={`text-sm font-medium transition-colors ${navTextColor}`}>
              Выкуп
            </Link>
            <button
              onClick={handleMenuClick("base-check")}
              className={`text-sm font-medium transition-colors ${navTextColor}`}
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
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E5E5] hover:bg-gray-50 transition-colors"
                >
                  <Bell className="w-4 h-4 text-[#303030]" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FA6868] text-[9px] font-medium text-white flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
                <Link
                  href="/support"
                  aria-label="Мои заявки"
                  className="relative hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E5E5E5] hover:bg-gray-50 transition-colors"
                  title="Активные заявки"
                >
                  <svg className="w-4 h-4 text-[#303030]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span className="text-xs text-[#303030]">{pendingTickets}</span>
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
        title={`Проверка по базе — ${baseCheckCost} баллов`}
        description={`Проверим вашу историю работы в такси и внесём в базу проверенных водителей. С баланса будет списано ${baseCheckCost} баллов дружбы.`}
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
