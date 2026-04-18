"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ────────────────────────────────────────────── */

interface Ticket {
  id: string;
  topic: string;
  status: string;
  body?: string | null;
  title?: string | null;
  createdAt: string;
}

interface TicketsResponse {
  data: Ticket[];
  total: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "gray" },
};

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка таксопарка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение к такси",
  BUYOUT: "Выкуп авто",
  LEGAL: "Юридический вопрос",
  FRIENDSHIP_POINTS: "Баллы дружбы",
  OTHER: "Иное",
};

const TABS: { key: string; label: string; topic?: string }[] = [
  { key: "all", label: "Все" },
  { key: "PARK_CHECK", label: "Проверки парков", topic: "PARK_CHECK" },
  { key: "USER_BASE_CHECK", label: "Проверка по базе", topic: "USER_BASE_CHECK" },
  { key: "TAXI_CONNECT", label: "Подключение", topic: "TAXI_CONNECT" },
  { key: "BUYOUT", label: "Выкуп", topic: "BUYOUT" },
  { key: "LEGAL", label: "Юридический", topic: "LEGAL" },
  { key: "FRIENDSHIP_POINTS", label: "Баллы", topic: "FRIENDSHIP_POINTS" },
  { key: "OTHER", label: "Иное", topic: "OTHER" },
];

/* ── component ─────────────────────────────────────────── */

export default function SupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const currentTab = TABS.find((t) => t.key === activeTab);
    const topicParam = currentTab?.topic ? `&topic=${currentTab.topic}` : "";
    api<TicketsResponse>(`/tickets?page=1&limit=50${topicParam}`, { token })
      .then((res) => setTickets(res.data || []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Не удалось загрузить тикеты");
        setTickets([]);
      })
      .finally(() => setLoading(false));
  }, [user, activeTab]);

  return (
    <div className="max-w-[700px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">
          Техподдержка
        </h1>
        <Link href="/support/new">
          <Button size="sm">Написать в техподдержку</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-[#303030] text-white"
                : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets list */}
      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : error ? (
        <p className="text-sm text-[#FA6868] text-center py-12">{error}</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 border border-[#E5E5E5] rounded-xl">
          <p className="text-sm text-[#A1A1A1] mb-3">Нет обращений</p>
          <Link href="/support/new">
            <Button size="sm">Создать обращение</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = STATUS_MAP[ticket.status] || { label: ticket.status, variant: "gray" as const };
            return (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="block border border-[#E5E5E5] rounded-xl p-4 hover:shadow-sm transition-shadow bg-white"
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
  );
}
