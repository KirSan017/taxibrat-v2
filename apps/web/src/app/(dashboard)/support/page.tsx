"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── mock data ─────────────────────────────────────────── */

type TicketStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
type TicketCategory = "check" | "order" | "buyout" | "support";

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  category: TicketCategory;
  date: string;
  preview: string;
}

const MOCK_TICKETS: Ticket[] = [
  { id: "1", title: "Проверка таксопарка «Альфа»", status: "IN_PROGRESS", category: "check", date: "14.04.2025", preview: "Менеджер запросил дополнительные документы..." },
  { id: "2", title: "Заказ «По делам» #1204", status: "COMPLETED", category: "order", date: "12.04.2025", preview: "Заказ выполнен успешно. Спасибо за обращение!" },
  { id: "3", title: "Проверка таксопарка «Мега Такси»", status: "NEW", category: "check", date: "10.04.2025", preview: "Ожидает назначения менеджера" },
  { id: "4", title: "Выкуп авто Hyundai Solaris", status: "IN_PROGRESS", category: "buyout", date: "08.04.2025", preview: "Документы на проверке у менеджера" },
  { id: "5", title: "Заказ «По делам» #1198", status: "COMPLETED", category: "order", date: "05.04.2025", preview: "Заказ выполнен. Начислено 50 баллов." },
  { id: "6", title: "Проверка таксопарка «Драйв Парк»", status: "REJECTED", category: "check", date: "03.04.2025", preview: "Отклонено: некорректные данные парка" },
  { id: "7", title: "Обращение в техподдержку", status: "COMPLETED", category: "support", date: "01.04.2025", preview: "Проблема решена. Спасибо за обращение!" },
];

const STATUS_MAP: Record<TicketStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  COMPLETED: { label: "Завершён", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
};

const TABS = [
  { key: "all", label: "Все" },
  { key: "check", label: "Проверки" },
  { key: "order", label: "По делам" },
  { key: "buyout", label: "Выкуп" },
] as const;

const SUPPORT_TOPICS = [
  "Проблема с проверкой таксопарка",
  "Вопрос по заказу «По делам»",
  "Проблема с выкупом авто",
  "Вопрос по баллам дружбы",
  "Изменение данных профиля",
  "Жалоба на водителя/парк",
  "Технические проблемы",
  "Другое",
];

/* ── component ─────────────────────────────────────────── */

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [topicModalOpen, setTopicModalOpen] = useState(false);

  const filtered = activeTab === "all"
    ? MOCK_TICKETS
    : MOCK_TICKETS.filter((t) => t.category === activeTab);

  return (
    <div className="max-w-[700px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">
          Техподдержка
        </h1>
        <Button size="sm" onClick={() => setTopicModalOpen(true)}>
          Написать в техподдержку
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-50 rounded-lg p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#303030] shadow-sm"
                : "text-[#A1A1A1] hover:text-[#303030]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[#A1A1A1]">Нет тикетов в этой категории</p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/${ticket.id}`}
              className="block border border-[#E5E5E5] rounded-xl p-4 hover:shadow-sm transition-shadow bg-white"
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
          ))
        )}
      </div>

      {/* Topic selector modal */}
      {topicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTopicModalOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-[#303030]">Выберите тему обращения</h2>
              <button
                onClick={() => setTopicModalOpen(false)}
                className="text-[#A1A1A1] hover:text-[#303030] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {SUPPORT_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTopicModalOpen(false);
                    // In production, this would create a new ticket
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-[#E5E5E5] text-sm text-[#303030] hover:bg-gray-50 hover:border-[#A1A1A1] transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
