"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Park {
  id: string;
  name: string;
  status: string;
  rating?: number | null;
  isAdvertised?: boolean;
  createdAt: string;
}

interface ParksResponse {
  data: Park[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
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

  // Duplicate detection by normalized name — parks sharing same name (case-insensitive, trimmed)
  const duplicatesByName = new Map<string, Park[]>();
  for (const p of parks) {
    const key = (p.name || "").trim().toLowerCase();
    if (!key) continue;
    if (!duplicatesByName.has(key)) duplicatesByName.set(key, []);
    duplicatesByName.get(key)!.push(p);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Таксопарки</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-[300px]">
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === s
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_CONFIG[s].label}
            </button>
          ))}
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
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Рейтинг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Таксопарки не найдены</td></tr>
            ) : filtered.map((park) => {
              const sc = STATUS_CONFIG[park.status] || { label: park.status, variant: "gray" as const };
              return (
                <tr
                  key={park.id}
                  className={`border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors ${
                    park.isAdvertised ? "bg-[#F8D62E]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/parks/${park.id}`} className="text-[#303030] font-medium hover:underline">
                      {park.name}
                    </Link>
                    {park.isAdvertised && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F8D62E] text-[#303030]">
                        AD
                      </span>
                    )}
                    {(() => {
                      const dupList = duplicatesByName.get((park.name || "").trim().toLowerCase()) || [];
                      const others = dupList.filter((d) => d.id !== park.id);
                      if (others.length === 0) return null;
                      return (
                        <span
                          className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-[#FA6868]/10 text-[#FA6868] font-medium cursor-help"
                          title={`Найдено парков с таким же названием: ${others.length}`}
                        >
                          Дубли: {others.length}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {park.rating != null ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#F8D62E]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {Number(park.rating).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[#A1A1A1]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">
                    {new Date(park.createdAt).toLocaleDateString("ru-RU")}
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
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Таксопарки не найдены
          </div>
        ) : filtered.map((park) => {
          const sc = STATUS_CONFIG[park.status] || { label: park.status, variant: "gray" as const };
          return (
            <Link
              key={park.id}
              href={`/admin/parks/${park.id}`}
              className="block bg-white border border-[#E5E5E5] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[#303030]">{park.name}</h3>
                  <p className="text-xs text-[#A1A1A1] mt-0.5">
                    {new Date(park.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
