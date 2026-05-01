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
  ADMIN_PRIMARY_BTN,
  ADMIN_SELECT,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
} from "@/components/admin/admin-styles";

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

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-[#E8F7EE] text-[#3BB560]",
  UPDATE: "bg-[#FEF7DA] text-[#9A7C00]",
  DELETE: "bg-[#FDE8E8] text-[#FA6868]",
  STATUS_CHANGE: "bg-[#E8F0FE] text-[#3D7BD9]",
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
      <div className="space-y-1.5 text-xs">
        {changed.map((k) => (
          <div key={k} className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-semibold text-[#1F1F1F]">{k}:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#FDE8E8] text-[#FA6868] line-through">
              {formatValue(ov[k])}
            </span>
            <span className="text-[#A1A1A1]">→</span>
            <span className="px-1.5 py-0.5 rounded bg-[#E8F7EE] text-[#3BB560]">
              {formatValue(nv[k])}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (oldValue != null && (newValue == null || newValue === undefined)) {
    return (
      <div className="text-xs">
        <span className="text-[#A1A1A1]">было: </span>
        <span className="text-[#FA6868]">{formatValue(oldValue)}</span>
      </div>
    );
  }

  if (newValue != null && (oldValue == null || oldValue === undefined)) {
    return (
      <div className="text-xs">
        <span className="text-[#A1A1A1]">стало: </span>
        <span className="text-[#3BB560]">{formatValue(newValue)}</span>
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
      {/* ── Page header ── */}
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Журнал</p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
          Архив изменений
          <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
            {total}
          </span>
        </h1>
        <p className={ADMIN_PAGE_SUBTITLE}>История действий пользователей в системе</p>
      </div>

      {/* ── Filter card ── */}
      <form onSubmit={handleSearch} className={`${ADMIN_CARD} p-5 mb-5`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Сущность
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className={ADMIN_SELECT}
            >
              <option value="">Все</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              ID актора
            </label>
            <input
              value={actorIdFilter}
              onChange={(e) => setActorIdFilter(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Поиск
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Имя, фраза, ID..."
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              От
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              До
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className={ADMIN_PRIMARY_BTN}>
            Применить фильтры
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className={`${ADMIN_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ADMIN_TABLE_HEADER}>Дата</th>
                <th className={ADMIN_TABLE_HEADER}>Актор</th>
                <th className={ADMIN_TABLE_HEADER}>Действие</th>
                <th className={ADMIN_TABLE_HEADER}>Сущность</th>
                <th className={ADMIN_TABLE_HEADER}>Объект</th>
                <th className={ADMIN_TABLE_HEADER}>Изменения</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Записей нет
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const link = entityLink(e.entity, e.entityId);
                  return (
                    <tr key={e.id} className={`${ADMIN_TABLE_ROW} align-top`}>
                      <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1] whitespace-nowrap`}>
                        {new Date(e.createdAt).toLocaleString("ru-RU")}
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} font-mono text-xs`}>
                        {e.actorId?.slice(0, 8) || "—"}
                      </td>
                      <td className={ADMIN_TABLE_CELL}>
                        <span
                          className={`inline-flex items-center px-2.5 h-[24px] rounded-full text-[11px] font-medium ${
                            ACTION_STYLES[e.action] || "bg-[#F2F2F2] text-[#A1A1A1]"
                          }`}
                        >
                          {ACTION_LABELS[e.action] || e.action}
                        </span>
                      </td>
                      <td className={ADMIN_TABLE_CELL}>
                        {ENTITY_LABELS[e.entity] || e.entity}
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} font-mono text-xs`}>
                        {link ? (
                          <Link
                            href={link}
                            className="text-[#1F1F1F] underline hover:no-underline"
                          >
                            {e.entityId?.slice(0, 8) || "—"}
                          </Link>
                        ) : (
                          <span className="text-[#A1A1A1]">{e.entityId?.slice(0, 8) || "—"}</span>
                        )}
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} max-w-[420px]`}>
                        <DiffView oldValue={e.oldValue} newValue={e.newValue} />
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
          totalPages={Math.max(1, Math.ceil(total / 50))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
