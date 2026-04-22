"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
}

const ENTITY_LABELS: Record<string, string> = {
  USER: "Пользователь",
  PARK: "Таксопарк",
  CAR: "Автомобиль",
  TICKET: "Тикет",
  POINTS: "Баллы",
  BUYOUT: "Выкуп",
  NEWS: "Новости",
  MANAGER_STATUS: "Статус менеджера",
  BUYOUT_LISTING: "Объявление выкупа",
  SETTING: "Настройки",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Изменение",
  DELETE: "Удаление",
  STATUS_CHANGE: "Смена статуса",
};

function entityLink(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entity) {
    case "USER":
      return `/admin/users?search=${entityId}`;
    case "PARK":
      return `/admin/parks-list?highlight=${entityId}`;
    case "CAR":
    case "BUYOUT":
    case "BUYOUT_LISTING":
      return `/admin/buyout/${entityId}`;
    case "TICKET":
      return `/admin/tickets/${entityId}`;
    default:
      return null;
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function DiffView({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  // Both объекты — покажем diff по ключам
  if (
    oldValue && typeof oldValue === "object" && !Array.isArray(oldValue) &&
    newValue && typeof newValue === "object" && !Array.isArray(newValue)
  ) {
    const ov = oldValue as Record<string, unknown>;
    const nv = newValue as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(ov), ...Object.keys(nv)]));
    const changed = keys.filter((k) => JSON.stringify(ov[k]) !== JSON.stringify(nv[k]));

    if (changed.length === 0) {
      return <p className="text-xs text-[#A1A1A1]">Без изменений</p>;
    }

    return (
      <div className="space-y-1 text-xs">
        {changed.map((k) => (
          <div key={k} className="flex flex-wrap gap-1">
            <span className="font-medium text-[#303030]">{k}:</span>
            <span className="text-[#A1A1A1]">было</span>
            <span className="text-[#FA6868]">{formatValue(ov[k])}</span>
            <span className="text-[#A1A1A1]">стало</span>
            <span className="text-[#303030]">{formatValue(nv[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  // oldValue только
  if (oldValue != null && (newValue == null || newValue === undefined)) {
    return (
      <div className="text-xs">
        <span className="text-[#A1A1A1]">было: </span>
        <span className="text-[#FA6868]">{formatValue(oldValue)}</span>
      </div>
    );
  }

  // newValue только
  if (newValue != null && (oldValue == null || oldValue === undefined)) {
    return (
      <div className="text-xs">
        <span className="text-[#A1A1A1]">стало: </span>
        <span className="text-[#303030]">{formatValue(newValue)}</span>
      </div>
    );
  }

  return <p className="text-xs text-[#A1A1A1]">—</p>;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entityFilter, setEntityFilter] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (entityFilter) params.set("entity", entityFilter);
    if (actorIdFilter) params.set("actorId", actorIdFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search.trim()) params.set("search", search.trim());
    api<AuditResponse>(`/admin/audit?${params.toString()}`, { token })
      .then((res) => {
        setEntries(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Архив изменений ({total})</h1>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <div className="w-[180px]">
          <label className="block text-xs text-[#A1A1A1] mb-1">Сущность</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-[40px] w-full px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          >
            <option value="">Все</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="w-[220px]">
          <label className="block text-xs text-[#A1A1A1] mb-1">ID актора</label>
          <Input value={actorIdFilter} onChange={(e) => setActorIdFilter(e.target.value)} />
        </div>
        <div className="w-[260px]">
          <label className="block text-xs text-[#A1A1A1] mb-1">Поиск по значениям</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имя, фраза, ID..."
          />
        </div>
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm">Искать</Button>
        </div>
      </form>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Актор</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Действие</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Сущность</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Объект</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Изменения</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Записей нет</td></tr>
            ) : entries.map((e) => {
              const link = entityLink(e.entity, e.entityId);
              return (
                <tr key={e.id} className="border-b border-[#E5E5E5] last:border-0 align-top">
                  <td className="px-4 py-3 text-[#A1A1A1] whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-[#303030] font-mono text-xs">
                    {e.actorId?.slice(0, 8) || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#303030]">
                    {ACTION_LABELS[e.action] || e.action}
                  </td>
                  <td className="px-4 py-3 text-[#303030]">
                    {ENTITY_LABELS[e.entity] || e.entity}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {link ? (
                      <Link href={link} className="text-[#303030] underline hover:no-underline">
                        {e.entityId?.slice(0, 8) || "—"}
                      </Link>
                    ) : (
                      <span className="text-[#A1A1A1]">{e.entityId?.slice(0, 8) || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[400px]">
                    <DiffView oldValue={e.oldValue} newValue={e.newValue} />
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
          totalPages={Math.max(1, Math.ceil(total / 50))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
