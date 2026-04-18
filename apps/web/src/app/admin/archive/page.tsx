"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

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

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const avgDuration = filtered.length
    ? (
        filtered.reduce((sum, t) => sum + durationDays(t.createdAt, t.updatedAt), 0) /
        filtered.length
      ).toFixed(1)
    : "—";

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-1">Архив</h1>
      <p className="text-sm text-[#A1A1A1] mb-6">
        Завершённые заявки — итоги работы менеджеров
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setPage(1);
          }}
          className="h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
        >
          <option value="ALL">Все темы</option>
          {Object.entries(TOPIC_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Всего в архиве</p>
          <p className="text-xl font-medium text-[#303030] mt-1">{total}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">На странице</p>
          <p className="text-xl font-medium text-[#303030] mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Ср. срок</p>
          <p className="text-xl font-medium text-[#303030] mt-1">{avgDuration} дн</p>
        </div>
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
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">
                Дата
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">
                Тип
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">
                Название
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">
                Результат
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">
                Баллы
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">
                Срок
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">
                  Записи не найдены
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-[#A1A1A1] whitespace-nowrap">
                    {formatDate(t.updatedAt)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-[10px] bg-gray-100 text-[#303030] px-1.5 py-0.5 rounded">
                      {TOPIC_LABELS[t.topic] ?? t.topic}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#303030] font-medium">{t.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="green">Завершено</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-[#303030]">
                    {t.pointsAwarded ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-[#A1A1A1] hidden lg:table-cell">
                    {durationDays(t.createdAt, t.updatedAt)} дн
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Загрузка...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Записи не найдены
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="text-sm font-medium text-[#303030]">{t.title}</h3>
                <Badge variant="green">Завершено</Badge>
              </div>
              <p className="text-xs text-[#A1A1A1]">
                {TOPIC_LABELS[t.topic] ?? t.topic} · {formatDate(t.updatedAt)}
              </p>
              <p className="text-xs text-[#A1A1A1] mt-1">
                Баллы: <span className="text-[#303030]">{t.pointsAwarded ?? 0}</span> ·{" "}
                {durationDays(t.createdAt, t.updatedAt)} дн
              </p>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm text-[#303030] bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>
          <span className="text-sm text-[#303030]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-[#303030] bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
