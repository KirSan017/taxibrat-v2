"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Ticket {
  id: string;
  topic: string;
  status: string;
  title?: string | null;
  body?: string | null;
  creatorId: string;
  assignedManagerId?: string | null;
  createdAt: string;
}

interface TicketsResponse {
  data: Ticket[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён СМ", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "gray" },
};

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка парка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение",
  BUYOUT: "Выкуп",
  LEGAL: "Юридический",
  FRIENDSHIP_POINTS: "Баллы",
  IDEA: "Идея",
  OTHER: "Иное",
};

type TabKey = "all" | "mine" | "review" | "PARK_CHECK" | "BUYOUT" | "TAXI_CONNECT" | "LEGAL" | "OTHER";

/* ── page ─────────────────────────────────────────────── */

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const isSuperManager = user?.role === "SUPER_MANAGER" || user?.role === "ADMIN";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "mine", label: "Мои тикеты" },
    ...(isSuperManager ? [{ key: "review" as TabKey, label: "На проверке СМ" }] : []),
    { key: "PARK_CHECK", label: "Проверки парков" },
    { key: "BUYOUT", label: "Выкуп" },
    { key: "TAXI_CONNECT", label: "Подключение" },
    { key: "LEGAL", label: "Юридические" },
    { key: "OTHER", label: "Иное" },
  ];

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");

    const base = `page=${page}&limit=${LIMIT}`;
    const url =
      activeTab === "review"
        ? `/admin/tickets/review?${base}`
        : activeTab === "mine"
          ? `/admin/tickets?${base}`
          : `/admin/tickets?${base}&topic=${activeTab}`;

    api<TicketsResponse>(url, { token })
      .then((res) => {
        setTickets(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
        setTickets([]);
      })
      .finally(() => setLoading(false));
  }, [user, activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

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

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Тикет</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Тема</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Тикеты не найдены</td></tr>
            ) : tickets.map((ticket) => {
              const sc = STATUS_CONFIG[ticket.status] || { label: ticket.status, variant: "gray" as const };
              const title = ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic;
              return (
                <tr key={ticket.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="text-[#303030] font-medium hover:underline">
                      {title}
                    </Link>
                    {ticket.body && (
                      <p className="text-xs text-[#A1A1A1] mt-0.5 line-clamp-1">{ticket.body}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">
                    {TOPIC_LABELS[ticket.topic] || ticket.topic}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">
                    {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Тикеты не найдены
          </div>
        ) : tickets.map((ticket) => {
          const sc = STATUS_CONFIG[ticket.status] || { label: ticket.status, variant: "gray" as const };
          const title = ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic;
          return (
            <Link
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="block bg-white border border-[#E5E5E5] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="text-sm font-medium text-[#303030]">{title}</h3>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
              <p className="text-xs text-[#A1A1A1]">{TOPIC_LABELS[ticket.topic] || ticket.topic}</p>
              <p className="text-[11px] text-[#A1A1A1] mt-1.5">
                {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
