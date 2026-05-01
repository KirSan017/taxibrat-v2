"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_CARD_HOVER,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_PILL_ACTIVE,
  ADMIN_PILL_BASE,
  ADMIN_PILL_INACTIVE,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "blue" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён СМ", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "grey" },
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

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  PARK_CHECK: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  BUYOUT: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h8l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2" />
    </svg>
  ),
  TAXI_CONNECT: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  LEGAL: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
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
      {/* ── Page header ── */}
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">
          Чат с пользователями
        </p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
          Тикеты
          <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
            {total}
          </span>
        </h1>
        <p className={ADMIN_PAGE_SUBTITLE}>Обращения и заявки в работе</p>
      </div>

      {/* ── Tabs (filter pills) ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`${ADMIN_PILL_BASE} ${
              activeTab === tab.key ? ADMIN_PILL_ACTIVE : ADMIN_PILL_INACTIVE
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* ── Ticket cards (single column list) ── */}
      <div className="space-y-3">
        {loading ? (
          <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-[#CDCDCD]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Тикеты не найдены
          </div>
        ) : (
          tickets.map((ticket) => {
            const sc = STATUS_CONFIG[ticket.status] || {
              label: ticket.status,
              variant: "grey" as const,
            };
            const topicLabel = TOPIC_LABELS[ticket.topic] || ticket.topic;
            const title = ticket.title || topicLabel;
            const created = new Date(ticket.createdAt);
            const timeStr = created.toLocaleString("ru-RU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                className={`block ${ADMIN_CARD_HOVER} p-5`}
              >
                <div className="flex items-start gap-4">
                  <span className="w-10 h-10 rounded-[10px] bg-[#FEF7DA] flex items-center justify-center text-[#9A7C00] shrink-0">
                    {TOPIC_ICONS[ticket.topic] || (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#1F1F1F] flex-1 min-w-0">
                        {title}
                      </h3>
                      <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A1A1A1] mb-2">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                        {timeStr}
                      </span>
                      <span>·</span>
                      <span>{topicLabel}</span>
                    </div>

                    {ticket.body && (
                      <p className="text-xs text-[#A1A1A1] line-clamp-2">{ticket.body}</p>
                    )}
                  </div>

                  <svg
                    className="w-5 h-5 text-[#CDCDCD] shrink-0 mt-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
