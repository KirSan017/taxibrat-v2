"use client";

import { useEffect, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_KPI_CARD,
  ADMIN_KPI_LABEL,
  ADMIN_KPI_VALUE,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_SELECT,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ─────────────────────────────────────────────── */

interface ApiTicket {
  id: string;
  title: string;
  topic: string;
  status: string;
  smRejectionReason: string | null;
  pointsAwarded: number | null;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  userId: string;
}

interface ApiListResponse {
  data: ApiTicket[];
  total: number;
  page: number;
  limit: number;
}

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка парка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение к такси",
  BUYOUT: "Выкуп авто",
  LEGAL: "Юридический",
  FRIENDSHIP_POINTS: "Баллы дружбы",
  IDEA: "Идея",
  OTHER: "Другое",
};

const ITEMS_PER_PAGE = 10;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function durationDays(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = Math.max(0, Math.round((e - s) / (24 * 3600_000)));
  return d;
}

export default function AdminArchivePage() {
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [total, setTotal] = useState(0);

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("status", "COMPLETED");
    params.set("page", String(page));
    params.set("limit", String(ITEMS_PER_PAGE));
    if (topicFilter !== "ALL") params.set("topic", topicFilter);
    api<ApiListResponse>(`/admin/tickets?${params.toString()}`, { token })
      .then((res) => {
        setTickets(Array.isArray(res?.data) ? res.data : []);
        setTotal(res?.total ?? 0);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setTickets([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicFilter, page]);

  const filtered = search.trim()
    ? tickets.filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
    : tickets;

  const avgDuration = filtered.length
    ? (
        filtered.reduce((sum, t) => sum + durationDays(t.createdAt, t.updatedAt), 0) /
        filtered.length
      ).toFixed(1)
    : "—";

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Завершённые</p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>Архив завершённых тикетов</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>Итоги работы менеджеров по закрытым заявкам</p>
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className={ADMIN_KPI_CARD}>
          <span className={ADMIN_KPI_LABEL}>Всего в архиве</span>
          <p className={ADMIN_KPI_VALUE}>{total}</p>
        </div>
        <div className={ADMIN_KPI_CARD}>
          <span className={ADMIN_KPI_LABEL}>На странице</span>
          <p className={ADMIN_KPI_VALUE}>{filtered.length}</p>
        </div>
        <div className={ADMIN_KPI_CARD}>
          <span className={ADMIN_KPI_LABEL}>Средний срок</span>
          <p className={ADMIN_KPI_VALUE}>
            {avgDuration} <span className="text-[18px] text-[#A1A1A1] font-normal">дн</span>
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={`${ADMIN_CARD} p-5 mb-5`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Поиск
            </label>
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Тема
            </label>
            <select
              value={topicFilter}
              onChange={(e) => {
                setTopicFilter(e.target.value);
                setPage(1);
              }}
              className={ADMIN_SELECT}
            >
              <option value="ALL">Все темы</option>
              {Object.entries(TOPIC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* ── Table (desktop) ── */}
      <div className={`hidden md:block ${ADMIN_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ADMIN_TABLE_HEADER}>Дата</th>
                <th className={ADMIN_TABLE_HEADER}>Тип</th>
                <th className={ADMIN_TABLE_HEADER}>Название</th>
                <th className={ADMIN_TABLE_HEADER}>Результат</th>
                <th className={`${ADMIN_TABLE_HEADER} text-right`}>Баллы</th>
                <th className={`${ADMIN_TABLE_HEADER} text-right`}>Срок</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Записи не найдены
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className={ADMIN_TABLE_ROW}>
                    <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1] whitespace-nowrap`}>
                      {formatDate(t.updatedAt)}
                    </td>
                    <td className={ADMIN_TABLE_CELL}>
                      <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[10px] font-medium bg-[#F2F2F2] text-[#1F1F1F]">
                        {TOPIC_LABELS[t.topic] ?? t.topic}
                      </span>
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} font-medium text-[#1F1F1F]`}>
                      {t.title}
                    </td>
                    <td className={ADMIN_TABLE_CELL}>
                      <span className={statusBadgeClass("green")}>Завершено</span>
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} text-right font-medium`}>
                      {t.pointsAwarded ?? 0}
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} text-right text-[#A1A1A1]`}>
                      {durationDays(t.createdAt, t.updatedAt)} дн
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>
            Записи не найдены
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className={`${ADMIN_CARD} p-4`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-[#1F1F1F]">{t.title}</h3>
                <span className={statusBadgeClass("green")}>Завершено</span>
              </div>
              <p className="text-xs text-[#A1A1A1]">
                {TOPIC_LABELS[t.topic] ?? t.topic} · {formatDate(t.updatedAt)}
              </p>
              <p className="text-xs text-[#A1A1A1] mt-1">
                Баллы: <span className="text-[#1F1F1F] font-medium">{t.pointsAwarded ?? 0}</span> ·{" "}
                {durationDays(t.createdAt, t.updatedAt)} дн
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
