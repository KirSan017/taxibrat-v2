"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────── */

interface TicketListItem {
  id: string;
  topic: string;
  status: string;
  body?: string | null;
  title?: string | null;
  createdAt: string;
}

interface TicketsResponse {
  data: TicketListItem[];
  total: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён СМ", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "gray" },
};

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка таксопарка",
  PARK_ADD: "Добавление таксопарка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение к такси",
  BUYOUT: "Выкуп авто",
  LEGAL: "Юридический вопрос",
  FRIENDSHIP_POINTS: "Баллы дружбы",
  IDEA: "Идея",
  OTHER: "Иное",
};

const DEFAULT_POINTS_INFO: { label: string }[] = [
  { label: "Регистрация + заполнение профиля — 100" },
  { label: "Приглашение друга — 200 вам / 100 другу" },
  { label: "Добавление таксопарка — 200" },
  { label: "Проверка таксопарка — 150" },
  { label: "Подключение к такси — 150" },
  { label: "Взять в аренду — 300" },
  { label: "Выкуп авто — 1000" },
  { label: "Идея — 50" },
];

/* ── component ─────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [pointsInfo, setPointsInfo] = useState<{ label: string }[]>(DEFAULT_POINTS_INFO);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setTicketsLoading(true);
    api<TicketsResponse>("/tickets?page=1&limit=3", { token })
      .then((res) => {
        setTickets(res.data || []);
        setTicketsTotal(res.total || 0);
      })
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false));
  }, [user]);

  useEffect(() => {
    api<Record<string, number>>("/public/points-config")
      .then((cfg) => {
        if (!cfg || typeof cfg !== "object") return;
        const pick = (key: string, fallback: number) =>
          typeof cfg[key] === "number" ? cfg[key] : fallback;
        setPointsInfo([
          { label: `Регистрация + заполнение профиля — ${pick("points_registration", 100)}` },
          { label: `Приглашение друга — ${pick("points_referral_register", 200)} вам / ${pick("points_referral_bonus", 100)} другу` },
          { label: `Добавление таксопарка — ${pick("points_park_add", 200)}` },
          { label: `Проверка таксопарка — ${pick("points_park_check", 150)}` },
          { label: `Подключение к такси — ${pick("points_taxi_connect", 150)}` },
          { label: `Взять в аренду — ${pick("points_rental_confirmed", 300)}` },
          { label: `Выкуп авто — ${pick("points_buyout", 1000)}` },
          { label: `Идея — ${pick("points_idea", 50)}` },
        ]);
      })
      .catch(() => {
        // fall back to DEFAULT_POINTS_INFO
      });
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-[900px]">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">
          Личный кабинет
        </h1>
        <span className="text-xs text-[#A1A1A1]">
          {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Profile status banner */}
      {user.status === "PHONE_VERIFIED" && (
        <div className="bg-[#F8D62E]/10 border border-[#F8D62E]/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#303030]">Заполните профиль для полного доступа</p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Заполните данные профиля и получите 100 баллов дружбы.
          </p>
          <Link href="/profile" className="text-xs text-[#303030] underline mt-2 inline-block">
            Заполнить профиль
          </Link>
        </div>
      )}
      {user.status === "PENDING_REVIEW" && (
        <div className="bg-[#F8D62E]/10 border border-[#F8D62E]/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#303030]">Ваш профиль на проверке</p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Ваш профиль проходит верификацию. Пожалуйста, ожидайте ответа.
          </p>
        </div>
      )}
      {user.status === "REJECTED" && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#FA6868]">Профиль отклонён</p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Причина: {user.rejectionReason || "Не указана"}
          </p>
          <Link href="/profile" className="text-xs text-[#303030] underline mt-2 inline-block">
            Исправить профиль
          </Link>
        </div>
      )}
      {user.status === "ACTIVE" && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-green-700">
            Добро пожаловать, {user.firstName || "водитель"}!
          </p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Ваш профиль подтверждён. Пользуйтесь всеми возможностями сервиса.
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white">
          <p className="text-xs text-[#A1A1A1] mb-1">Баллы дружбы</p>
          <p className="text-2xl font-medium text-[#303030]">{user.friendshipPoints || 0}</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white">
          <p className="text-xs text-[#A1A1A1] mb-1">Обращений</p>
          <p className="text-2xl font-medium text-[#303030]">{ticketsTotal}</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white">
          <p className="text-xs text-[#A1A1A1] mb-1">Статус</p>
          <p className="text-sm font-medium text-[#303030] mt-1">
            {user.status === "ACTIVE" ? "Активен"
              : user.status === "PENDING_REVIEW" ? "На проверке"
              : user.status === "REJECTED" ? "Отклонён"
              : "Не заполнен"}
          </p>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/parks"
          className="bg-[#303030] rounded-2xl p-5 text-white flex flex-col justify-between min-h-[140px] hover:bg-[#404040] transition-colors"
        >
          <span className="text-sm font-medium">Таксопарки</span>
          <span className="text-xs text-white/60 mt-auto">аренда</span>
        </Link>
        <Link
          href="/no9"
          className="bg-[#F8D62E] rounded-2xl p-5 text-[#303030] flex flex-col justify-between min-h-[140px] hover:bg-[#F8D62E]/80 transition-colors"
        >
          <span className="text-sm font-medium">По делам, без 9%</span>
          <span className="text-xs text-[#303030]/60 mt-auto">заказы</span>
        </Link>
        <Link
          href="/buyout"
          className="bg-[#F3F1E7] rounded-2xl p-5 text-[#303030] flex flex-col justify-between min-h-[140px] hover:bg-[#F3F1E7]/70 transition-colors"
        >
          <span className="text-sm font-medium">Автомобили</span>
          <span className="text-xs text-[#A1A1A1] mt-auto">под выкуп</span>
        </Link>
      </div>

      {/* Two-column: subscription + how to earn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Subscription CTA */}
        <div className="bg-[#F8D62E] rounded-2xl p-6">
          <p className="text-sm font-medium text-[#303030] mb-1">Пригласите друзей</p>
          <p className="text-sm font-medium text-[#303030]">и получайте баллы!</p>
          <Link
            href="/referrals"
            className="mt-4 inline-flex items-center gap-2 bg-[#303030] text-white text-xs font-medium rounded-lg px-4 py-2.5 hover:bg-[#404040] transition-colors"
          >
            Реферальная программа
          </Link>
        </div>

        {/* How to earn points */}
        <div className="border border-[#E5E5E5] rounded-2xl p-6">
          <h3 className="text-sm font-medium text-[#303030] mb-4">
            Как получить &quot;Баллы дружбы&quot;?
          </h3>
          <ul className="space-y-2.5">
            {pointsInfo.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#A1A1A1]">
                <span className="w-1 h-1 rounded-full bg-[#A1A1A1] mt-1.5 shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[#303030] mb-4">Последние обращения</h2>
        {ticketsLoading ? (
          <p className="text-sm text-[#A1A1A1]">Загрузка...</p>
        ) : tickets.length === 0 ? (
          <div className="border border-[#E5E5E5] rounded-xl p-8 text-center">
            <p className="text-sm text-[#A1A1A1]">Обращений пока нет</p>
            <Link href="/support/new" className="text-xs text-[#303030] underline mt-2 inline-block">
              Создать обращение
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const status = STATUS_MAP[ticket.status] || { label: ticket.status, variant: "gray" as const };
              return (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  className="block border border-[#E5E5E5] rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-medium text-[#303030]">
                      {ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic}
                    </h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {ticket.body && (
                    <p className="text-xs text-[#A1A1A1] mb-1 line-clamp-2">{ticket.body}</p>
                  )}
                  <p className="text-[10px] text-[#A1A1A1]">
                    {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
