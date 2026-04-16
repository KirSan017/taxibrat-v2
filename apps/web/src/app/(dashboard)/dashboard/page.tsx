"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── mock data ─────────────────────────────────────────── */

const MOCK_USER = {
  name: "Иван",
  status: "PENDING" as "PENDING" | "REJECTED" | "ACTIVE",
  rejectionReason: "",
  points: 156,
  checks: 3,
  orders: 0,
};

const MOCK_TICKETS = [
  {
    id: "1",
    title: "Проверка таксопарка «Альфа»",
    status: "IN_PROGRESS" as const,
    date: "14.04.2025",
    preview: "Менеджер запросил дополнительные документы...",
  },
  {
    id: "2",
    title: "Заказ «По делам» #1204",
    status: "COMPLETED" as const,
    date: "12.04.2025",
    preview: "Заказ выполнен успешно. Спасибо за обращение!",
  },
  {
    id: "3",
    title: "Проверка таксопарка «Мега Такси»",
    status: "NEW" as const,
    date: "10.04.2025",
    preview: "Ожидает назначения менеджера",
  },
];

const STATUS_MAP = {
  NEW: { label: "Новый", variant: "yellow" as const },
  IN_PROGRESS: { label: "В работе", variant: "gray" as const },
  COMPLETED: { label: "Завершён", variant: "green" as const },
  REJECTED: { label: "Отклонён", variant: "red" as const },
};

const POINTS_INFO = [
  { label: "Приглашение друга — 300 б. в лен и 100 б. другу", icon: "gift" },
  { label: "Отправить на проверку — 200 баллов", icon: "check" },
  { label: "Пожаловаться на водителя — 150 баллов", icon: "flag" },
  { label: "Взять такси в аренду через наш сервис — 500 баллов", icon: "car" },
  { label: "Выкуп авто в рассрочку через нас — 1000 баллов", icon: "star" },
];

/* ── component ─────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="max-w-[900px]">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">
          Личный кабинет
        </h1>
        <span className="text-xs text-[#A1A1A1]">Янв 16, 2025</span>
      </div>

      {/* Profile status banner */}
      {MOCK_USER.status === "PENDING" && (
        <div className="bg-[#F8D62E]/10 border border-[#F8D62E]/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#303030]">Ваша заявка принята.</p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Ваш профиль проходит верификацию. Пожалуйста, ожидайте ответа.
          </p>
          <Link href="/support" className="text-xs text-[#303030] underline mt-2 inline-block">
            Отследить заявку
          </Link>
        </div>
      )}
      {MOCK_USER.status === "REJECTED" && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#FA6868]">Профиль отклонён</p>
          <p className="text-xs text-[#A1A1A1] mt-1">
            Причина: {MOCK_USER.rejectionReason || "Не указана"}
          </p>
          <Link href="/profile" className="text-xs text-[#303030] underline mt-2 inline-block">
            Исправить профиль
          </Link>
        </div>
      )}

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
          href="#"
          className="bg-[#F8D62E] rounded-2xl p-5 text-[#303030] flex flex-col justify-between min-h-[140px] hover:bg-[#F8D62E]/80 transition-colors"
        >
          <span className="text-sm font-medium">По делам, без 9%</span>
          <span className="text-xs text-[#303030]/60 mt-auto">заказы</span>
        </Link>
        <Link
          href="#"
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
          <p className="text-sm font-medium text-[#303030] mb-1">Подписаться</p>
          <p className="text-sm font-medium text-[#303030]">и тусить за 5 минут!</p>
          <div className="mt-4 flex gap-2">
            <span className="bg-white rounded-full px-3 py-1 text-xs font-medium text-[#303030]">Бонус / Комплименту</span>
          </div>
          <Link
            href="/referrals"
            className="mt-4 inline-flex items-center gap-2 bg-[#303030] text-white text-xs font-medium rounded-lg px-4 py-2.5 hover:bg-[#404040] transition-colors"
          >
            Пригласи и будь счастливчиком
          </Link>
          <p className="text-xs text-[#303030]/60 mt-3">
            <Link href="/referrals" className="underline">Ещё акции</Link>
          </p>
        </div>

        {/* How to earn points */}
        <div className="border border-[#E5E5E5] rounded-2xl p-6">
          <h3 className="text-sm font-medium text-[#303030] mb-4">
            Как получить &quot;Баллы дружбы&quot;?
          </h3>
          <ul className="space-y-2.5">
            {POINTS_INFO.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#A1A1A1]">
                <span className="w-1 h-1 rounded-full bg-[#A1A1A1] mt-1.5 shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* News section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[#303030] mb-4">Новости сервиса</h2>
        <div className="space-y-4">
          {MOCK_TICKETS.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/${ticket.id}`}
              className="block border border-[#E5E5E5] rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-medium text-[#303030]">{ticket.title}</h3>
                <Badge variant={STATUS_MAP[ticket.status].variant}>
                  {STATUS_MAP[ticket.status].label}
                </Badge>
              </div>
              <p className="text-xs text-[#A1A1A1] mb-1">{ticket.preview}</p>
              <p className="text-[10px] text-[#A1A1A1]">{ticket.date}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Pagination (news) */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((page) => (
          <button
            key={page}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
              page === 1
                ? "bg-[#F8D62E] text-[#303030]"
                : "text-[#A1A1A1] hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}
        <button className="w-8 h-8 rounded-lg text-xs text-[#A1A1A1] hover:bg-gray-50">
          ...
        </button>
        <button className="w-8 h-8 rounded-lg text-xs text-[#A1A1A1] hover:bg-gray-50">
          22
        </button>
      </div>
    </div>
  );
}
