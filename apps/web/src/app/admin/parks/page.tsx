"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PILL_BASE,
  ADMIN_PILL_ACTIVE,
  ADMIN_PILL_INACTIVE,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface Park {
  id: string;
  name: string;
  status: string;
  rating?: number | null;
  isAdvertised?: boolean;
  isSuperAdvertised?: boolean;
  createdAt: string;
}

interface ParksResponse {
  data: Park[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "green" | "yellow" | "red" | "grey" | "blue" }
> = {
  DRAFT: { label: "Черновик", variant: "grey" },
  PENDING_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminParksPage() {
  const { user } = useAuth();
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<ParksResponse>(`/admin/parks?page=${page}&limit=${LIMIT}`, { token })
      .then((res) => {
        setParks(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [user, page]);

  const filtered = parks.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const duplicatesByName = new Map<string, Park[]>();
  for (const p of parks) {
    const key = (p.name || "").trim().toLowerCase();
    if (!key) continue;
    if (!duplicatesByName.has(key)) duplicatesByName.set(key, []);
    duplicatesByName.get(key)!.push(p);
  }

  const statusCounts = (() => {
    const counts: Record<string, number> = { ALL: parks.length };
    for (const p of parks) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  })();

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Парки</p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Модерация заявок
            <span className="inline-flex items-center justify-center min-w-[32px] h-[26px] px-2 rounded-full text-xs font-semibold bg-[#F8D62E] text-[#1F1F1F]">
              {statusCounts.PENDING_REVIEW || 0}
            </span>
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Заявки пользователей на проверку и добавление таксопарков. Активные парки →
            <Link href="/admin/parks-list" className="text-[#1F1F1F] ml-1 font-medium hover:underline">
              «Парки (управление)»
            </Link>
          </p>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["ALL", "PENDING_REVIEW", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((s) => {
          const isActive = statusFilter === s;
          const label = s === "ALL" ? "Все" : STATUS_CONFIG[s].label;
          const count = statusCounts[s] || 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`${ADMIN_PILL_BASE} ${isActive ? ADMIN_PILL_ACTIVE : ADMIN_PILL_INACTIVE}`}
            >
              {label}
              <span
                className={`ml-1 min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                  isActive ? "bg-white/20 text-white" : "bg-[#F2F2F2] text-[#A1A1A1]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className="mb-5">
        <div className="relative w-full sm:max-w-[360px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1A1] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${ADMIN_INPUT} pl-11`}
          />
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
                <th className={ADMIN_TABLE_HEADER}>Название</th>
                <th className={ADMIN_TABLE_HEADER}>Рейтинг</th>
                <th className={ADMIN_TABLE_HEADER}>Статус</th>
                <th className={ADMIN_TABLE_HEADER}>Дата заявки</th>
                <th className={`${ADMIN_TABLE_HEADER} text-right`}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Таксопарки не найдены
                  </td>
                </tr>
              ) : (
                filtered.map((park) => {
                  const sc = STATUS_CONFIG[park.status] || { label: park.status, variant: "grey" as const };
                  const dupList = duplicatesByName.get((park.name || "").trim().toLowerCase()) || [];
                  const others = dupList.filter((d) => d.id !== park.id);
                  return (
                    <tr
                      key={park.id}
                      className={`${ADMIN_TABLE_ROW} ${
                        park.isAdvertised ? "bg-[#FFFBE6]" : ""
                      }`}
                    >
                      <td className={ADMIN_TABLE_CELL}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/parks/${park.id}`}
                            className="font-medium text-[#1F1F1F] hover:text-[#9A7C00] transition-colors"
                          >
                            {park.name}
                          </Link>
                          {(park.isAdvertised || park.isSuperAdvertised) && (
                            <span className="inline-flex items-center gap-0.5 px-2 h-[22px] rounded-full text-[10px] font-semibold bg-[#F8D62E] text-[#1F1F1F]">
                              <span aria-hidden>★</span>
                              {park.isSuperAdvertised ? "Супер" : "Реклама"}
                            </span>
                          )}
                          {others.length > 0 && (
                            <span
                              className="inline-flex items-center px-2 h-[22px] rounded-full text-[10px] font-semibold bg-[#FDE8E8] text-[#FA6868] cursor-help"
                              title={`Дублей с таким названием: ${others.length}`}
                            >
                              Дубли: {others.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={ADMIN_TABLE_CELL}>
                        {park.rating != null ? (
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="w-4 h-4 text-[#F8D62E]"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-medium">{Number(park.rating).toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="text-[#CDCDCD]">—</span>
                        )}
                      </td>
                      <td className={ADMIN_TABLE_CELL}>
                        <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>
                        {new Date(park.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} text-right`}>
                        <Link
                          href={`/admin/parks/${park.id}`}
                          className="inline-flex items-center justify-center h-[32px] px-3 rounded-[8px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F8D62E] transition-colors"
                        >
                          Открыть →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>
            Таксопарки не найдены
          </div>
        ) : (
          filtered.map((park) => {
            const sc = STATUS_CONFIG[park.status] || { label: park.status, variant: "grey" as const };
            return (
              <Link
                key={park.id}
                href={`/admin/parks/${park.id}`}
                className={`block ${ADMIN_CARD} p-4 ${
                  park.isAdvertised ? "bg-[#FFFBE6]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#1F1F1F]">{park.name}</h3>
                    <p className="text-xs text-[#A1A1A1] mt-1">
                      {new Date(park.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
