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

const STATUS_MAP: Record<
  string,
  { label: string; variant: "yellow" | "gray" | "green" | "red" }
> = {
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
        /* fall back */
      });
  }, []);

  if (!user) return null;

  const statusLabel =
    user.status === "ACTIVE"
      ? "Активен"
      : user.status === "PENDING_REVIEW"
      ? "На проверке"
      : user.status === "REJECTED"
      ? "Отклонён"
      : "Не заполнен";

  return (
    <div className="max-w-[1000px]">
      {/* Title */}
      <div className="flex items-center justify-between mb-[24px] md:mb-[30px]">
        <h1 className="text-[28px] md:text-[40px] font-medium text-[#303030] tracking-[-0.02em]">
          Личный кабинет
        </h1>
        <span className="text-[13px] text-[#A1A1A1]">
          {new Date().toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Profile status banner */}
      {user.status === "PHONE_VERIFIED" && (
        <div className="bg-[#FFF8D6] border border-[#F8D62E]/40 rounded-[16px] p-[20px] mb-[24px] flex items-start gap-[16px]">
          <div className="w-[40px] h-[40px] rounded-full bg-[#F8D62E]/30 flex items-center justify-center shrink-0">
            <svg
              className="w-[20px] h-[20px] text-[#8A7020]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-[#303030]">
              Заполните профиль для полного доступа
            </p>
            <p className="text-[12px] text-[#A1A1A1] mt-[4px]">
              Заполните данные профиля и&nbsp;получите 100&nbsp;баллов дружбы.
            </p>
            <Link
              href="/profile"
              className="mt-[12px] inline-flex items-center justify-center h-[36px] px-[16px] rounded-[8px] bg-[#303030] text-white text-[12px] font-medium hover:bg-[#404040] transition-colors"
            >
              Заполнить профиль
            </Link>
          </div>
        </div>
      )}
      {user.status === "PENDING_REVIEW" && (
        <div className="bg-[#FFF8D6] border border-[#F8D62E]/40 rounded-[16px] p-[20px] mb-[24px]">
          <p className="text-[14px] font-medium text-[#303030]">Ваш профиль на&nbsp;проверке</p>
          <p className="text-[12px] text-[#A1A1A1] mt-[4px]">
            Ваш профиль проходит верификацию. Пожалуйста, ожидайте ответа.
          </p>
        </div>
      )}
      {user.status === "REJECTED" && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-[16px] p-[20px] mb-[24px]">
          <p className="text-[14px] font-medium text-[#FA6868]">Профиль отклонён</p>
          <p className="text-[12px] text-[#A1A1A1] mt-[4px]">
            Причина: {user.rejectionReason || "Не указана"}
          </p>
          <Link
            href="/profile"
            className="mt-[12px] inline-flex items-center justify-center h-[36px] px-[16px] rounded-[8px] bg-[#303030] text-white text-[12px] font-medium hover:bg-[#404040] transition-colors"
          >
            Исправить профиль
          </Link>
        </div>
      )}

      {/* ══════ Welcome dark card with main stats ══════ */}
      <div className="bg-[#1F1F1F] rounded-[20px] p-[24px] md:p-[40px] mb-[24px] md:mb-[30px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-[24px]">
          <div className="min-w-0">
            <p className="text-[12px] md:text-[14px] text-white/60 mb-[6px]">
              Добро пожаловать,
            </p>
            <p className="text-[24px] md:text-[32px] font-medium text-white leading-[1.1] tracking-[-0.01em] truncate">
              {user.firstName || "водитель"}
              {user.lastName ? ` ${user.lastName}` : ""}
            </p>
            <div className="mt-[16px] md:mt-[20px] inline-flex items-center gap-[8px] h-[34px] px-[14px] rounded-[10px] bg-white/10 text-white text-[12px] font-medium">
              <span
                className={`w-[8px] h-[8px] rounded-full ${
                  user.status === "ACTIVE"
                    ? "bg-[#3BB560]"
                    : user.status === "REJECTED"
                    ? "bg-[#FA6868]"
                    : "bg-[#F8D62E]"
                }`}
              />
              {statusLabel}
            </div>
          </div>

          <div className="flex gap-[12px] md:gap-[16px]">
            <div className="bg-[#F8D62E] rounded-[16px] px-[20px] md:px-[28px] py-[16px] md:py-[20px] min-w-[160px]">
              <p className="text-[11px] md:text-[12px] text-[#303030]/60 mb-[4px]">Баллы дружбы</p>
              <p className="text-[28px] md:text-[40px] font-medium text-[#303030] leading-none tracking-[-0.02em]">
                {user.friendshipPoints || 0}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-[16px] px-[20px] md:px-[28px] py-[16px] md:py-[20px] min-w-[120px]">
              <p className="text-[11px] md:text-[12px] text-white/60 mb-[4px]">Обращений</p>
              <p className="text-[28px] md:text-[40px] font-medium text-white leading-none tracking-[-0.02em]">
                {ticketsTotal}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Quick action cards ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] mb-[24px] md:mb-[30px]">
        <Link
          href="/parks"
          className="group bg-white border border-[#EFEFEF] rounded-[20px] p-[24px] flex flex-col justify-between min-h-[180px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow relative overflow-hidden"
        >
          <div className="w-[44px] h-[44px] rounded-[12px] bg-[#F3F1E7] flex items-center justify-center">
            <svg
              className="w-[22px] h-[22px] text-[#303030]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 011-1h2M7 17h6m0 0V8h5l3 4v5h-2m-3 0v-5h-3v5" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-medium text-[#303030] leading-[1.2]">Таксопарки</p>
            <p className="text-[12px] text-[#A1A1A1] mt-[4px]">Аренда и&nbsp;рейтинг</p>
          </div>
        </Link>

        <Link
          href="/no9"
          className="group bg-[#F8D62E] rounded-[20px] p-[24px] flex flex-col justify-between min-h-[180px] hover:bg-[#F8D62E]/90 transition-colors relative overflow-hidden"
        >
          <div className="w-[44px] h-[44px] rounded-[12px] bg-[#303030]/10 flex items-center justify-center">
            <svg
              className="w-[22px] h-[22px] text-[#303030]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-medium text-[#303030] leading-[1.2]">
              По делам, без&nbsp;9%
            </p>
            <p className="text-[12px] text-[#303030]/60 mt-[4px]">Заказы напрямую</p>
          </div>
        </Link>

        <Link
          href="/buyout"
          className="group bg-[#1F1F1F] rounded-[20px] p-[24px] flex flex-col justify-between min-h-[180px] hover:bg-[#303030] transition-colors relative overflow-hidden"
        >
          <div className="w-[44px] h-[44px] rounded-[12px] bg-white/10 flex items-center justify-center">
            <svg
              className="w-[22px] h-[22px] text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-medium text-white leading-[1.2]">Автомобили</p>
            <p className="text-[12px] text-white/60 mt-[4px]">Под выкуп</p>
          </div>
        </Link>
      </div>

      {/* ══════ Two-column: referrals + points info ══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[24px] md:mb-[30px]">
        <div className="bg-[#F8D62E] rounded-[20px] p-[24px] md:p-[30px] relative overflow-hidden">
          <div className="relative z-10 max-w-[80%]">
            <p className="text-[20px] md:text-[24px] font-medium text-[#303030] leading-[1.2] tracking-[-0.01em]">
              Пригласите друзей
              <br />и&nbsp;получайте баллы!
            </p>
            <Link
              href="/referrals"
              className="mt-[20px] inline-flex items-center justify-center h-[42px] px-[24px] rounded-[10px] bg-[#303030] text-white text-[13px] font-medium hover:bg-[#404040] transition-colors"
            >
              Реферальная программа
            </Link>
          </div>
          <svg
            className="absolute bottom-[-20px] right-[-20px] w-[180px] h-[180px] text-[#303030]/5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[24px] md:p-[30px]">
          <h3 className="text-[16px] md:text-[18px] font-medium text-[#303030] mb-[16px]">
            Как получить «Баллы дружбы»?
          </h3>
          <ul className="space-y-[10px]">
            {pointsInfo.map((item, i) => (
              <li key={i} className="flex items-start gap-[10px] text-[12px] md:text-[13px] text-[#A1A1A1] leading-[1.5]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#F8D62E] mt-[7px] shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ══════ Recent tickets ══════ */}
      <div className="mb-[40px]">
        <div className="flex items-center justify-between mb-[16px] md:mb-[20px]">
          <h2 className="text-[20px] md:text-[28px] font-semibold text-[#303030] tracking-[-0.01em]">
            Последние обращения
          </h2>
          {ticketsTotal > 3 && (
            <Link
              href="/support"
              className="text-[13px] text-[#303030] underline hover:no-underline"
            >
              Все обращения
            </Link>
          )}
        </div>
        {ticketsLoading ? (
          <div className="space-y-[10px]">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-[80px] rounded-[16px] bg-[#FAFAFA] animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[40px] text-center">
            <p className="text-[14px] text-[#A1A1A1] mb-[8px]">Обращений пока нет</p>
            <Link
              href="/support/new"
              className="text-[13px] text-[#303030] underline hover:no-underline"
            >
              Создать обращение
            </Link>
          </div>
        ) : (
          <div className="space-y-[10px]">
            {tickets.map((ticket) => {
              const status =
                STATUS_MAP[ticket.status] || {
                  label: ticket.status,
                  variant: "gray" as const,
                };
              return (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  className="block bg-white border border-[#EFEFEF] rounded-[16px] p-[20px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow"
                >
                  <div className="flex items-start justify-between gap-[12px] mb-[8px]">
                    <h3 className="text-[14px] font-medium text-[#303030]">
                      {ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic}
                    </h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {ticket.body && (
                    <p className="text-[12px] text-[#A1A1A1] mb-[4px] line-clamp-2">
                      {ticket.body}
                    </p>
                  )}
                  <p className="text-[11px] text-[#A1A1A1]">
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
