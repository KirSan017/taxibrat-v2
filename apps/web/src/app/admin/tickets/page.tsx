"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* ── types & mock data ────────────────────────────────── */

type TicketStatus = "NEW" | "IN_PROGRESS" | "SM_REVIEW" | "COMPLETED" | "REJECTED";
type TicketCategory = "check" | "order" | "buyout" | "support";

interface Ticket {
  id: string;
  title: string;
  userName: string;
  status: TicketStatus;
  category: TicketCategory;
  date: string;
  topic: string;
  expired: boolean;
}

const MOCK_TICKETS: Ticket[] = [
  { id: "1", title: "Проверка таксопарка «Альфа»", userName: "Иванов И.И.", status: "NEW", category: "check", date: "16.04.2026", topic: "Проверка", expired: true },
  { id: "2", title: "Заказ «По делам» #1204", userName: "Петров П.С.", status: "IN_PROGRESS", category: "order", date: "15.04.2026", topic: "По делам", expired: false },
  { id: "3", title: "Выкуп Hyundai Solaris 2023", userName: "Сидорова М.А.", status: "SM_REVIEW", category: "buyout", date: "14.04.2026", topic: "Выкуп", expired: false },
  { id: "4", title: "Проверка «Мега Такси»", userName: "Козлов А.Д.", status: "IN_PROGRESS", category: "check", date: "13.04.2026", topic: "Проверка", expired: true },
  { id: "5", title: "Обращение по баллам", userName: "Смирнов Д.О.", status: "COMPLETED", category: "support", date: "12.04.2026", topic: "Поддержка", expired: false },
  { id: "6", title: "Заказ «По делам» #1198", userName: "Кузнецова А.П.", status: "COMPLETED", category: "order", date: "10.04.2026", topic: "По делам", expired: false },
  { id: "7", title: "Выкуп Toyota Camry 2022", userName: "Попов Р.В.", status: "NEW", category: "buyout", date: "09.04.2026", topic: "Выкуп", expired: false },
  { id: "8", title: "Проверка «Драйв Парк»", userName: "Новикова Е.А.", status: "REJECTED", category: "check", date: "07.04.2026", topic: "Проверка", expired: false },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  COMPLETED: { label: "Завершён", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
};

type TabKey = "all" | "check" | "order" | "buyout" | "sm_review";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "check", label: "Проверки" },
  { key: "order", label: "По делам" },
  { key: "buyout", label: "Выкуп" },
  { key: "sm_review", label: "На проверке СМ" },
];

/* ── page ─────────────────────────────────────────────── */

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filtered = MOCK_TICKETS.filter((t) => {
    if (activeTab === "all") return true;
    if (activeTab === "sm_review") return t.status === "SM_REVIEW";
    return t.category === activeTab;
  });

  // Sort: expired first
  const sorted = [...filtered].sort((a, b) => {
    if (a.expired && !b.expired) return -1;
    if (!a.expired && b.expired) return 1;
    return 0;
  });

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Тикеты</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-[#303030] text-white"
                : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Заголовок</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Пользователь</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Тема</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ticket) => {
              const sc = STATUS_CONFIG[ticket.status];
              return (
                <tr
                  key={ticket.id}
                  className={`border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors ${
                    ticket.expired ? "bg-[#FA6868]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/support/${ticket.id}`} className="text-[#303030] font-medium hover:underline">
                      {ticket.title}
                    </Link>
                    {ticket.expired && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#FA6868] text-white">
                        Просрочен
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{ticket.userName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">{ticket.topic}</td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">{ticket.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Тикеты не найдены</div>
        )}
      </div>
    </div>
  );
}
