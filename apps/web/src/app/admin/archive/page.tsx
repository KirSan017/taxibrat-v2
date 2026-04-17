"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/* ── types & mock data ────────────────────────────────── */

type EntityType = "PARK_CHECK" | "BUYOUT" | "TICKET" | "NO_9_ORDER" | "USER";

interface ArchiveEntry {
  id: string;
  completedAt: string;
  entityType: EntityType;
  title: string;
  assignee: string;
  result: "APPROVED" | "REJECTED" | "COMPLETED";
  durationDays: number;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  PARK_CHECK: "Проверка парка",
  BUYOUT: "Выкуп авто",
  TICKET: "Тикет",
  NO_9_ORDER: "Заказ без 9%",
  USER: "Пользователь",
};

const RESULT_CONFIG: Record<ArchiveEntry["result"], { label: string; variant: "green" | "red" | "yellow" }> = {
  APPROVED: { label: "Одобрено", variant: "green" },
  REJECTED: { label: "Отклонено", variant: "red" },
  COMPLETED: { label: "Завершено", variant: "yellow" },
};

const MOCK_ARCHIVE: ArchiveEntry[] = [
  { id: "1", completedAt: "16.04.2026", entityType: "PARK_CHECK", title: "Проверка «Драйв Парк»", assignee: "Мария К.", result: "APPROVED", durationDays: 2 },
  { id: "2", completedAt: "15.04.2026", entityType: "BUYOUT", title: "Kia Rio 2022 — публикация", assignee: "Анна Н.", result: "APPROVED", durationDays: 1 },
  { id: "3", completedAt: "15.04.2026", entityType: "TICKET", title: "Вопрос про бонусы", assignee: "Дмитрий С.", result: "COMPLETED", durationDays: 1 },
  { id: "4", completedAt: "14.04.2026", entityType: "PARK_CHECK", title: "Проверка «Альфа»", assignee: "Игорь Б.", result: "REJECTED", durationDays: 3 },
  { id: "5", completedAt: "14.04.2026", entityType: "NO_9_ORDER", title: "Заказ #1324 — доставлен", assignee: "Екатерина Р.", result: "COMPLETED", durationDays: 1 },
  { id: "6", completedAt: "12.04.2026", entityType: "USER", title: "Верификация Петров П.С.", assignee: "Мария К.", result: "APPROVED", durationDays: 1 },
  { id: "7", completedAt: "11.04.2026", entityType: "BUYOUT", title: "Toyota Camry 2022 — отклонено", assignee: "Анна Н.", result: "REJECTED", durationDays: 2 },
  { id: "8", completedAt: "10.04.2026", entityType: "TICKET", title: "Жалоба на парк", assignee: "Дмитрий С.", result: "COMPLETED", durationDays: 4 },
  { id: "9", completedAt: "09.04.2026", entityType: "PARK_CHECK", title: "Проверка «Голд Такси»", assignee: "Игорь Б.", result: "APPROVED", durationDays: 2 },
  { id: "10", completedAt: "08.04.2026", entityType: "NO_9_ORDER", title: "Заказ #1298 — отменён", assignee: "Екатерина Р.", result: "COMPLETED", durationDays: 1 },
  { id: "11", completedAt: "06.04.2026", entityType: "USER", title: "Верификация Козлов А.Д.", assignee: "Мария К.", result: "REJECTED", durationDays: 2 },
  { id: "12", completedAt: "05.04.2026", entityType: "PARK_CHECK", title: "Проверка «Мега Такси»", assignee: "Фёдоров А.", result: "APPROVED", durationDays: 3 },
];

const ITEMS_PER_PAGE = 8;

/* ── page ─────────────────────────────────────────────── */

export default function AdminArchivePage() {
  const [entityFilter, setEntityFilter] = useState<EntityType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = MOCK_ARCHIVE.filter((e) => {
    if (entityFilter !== "ALL" && e.entityType !== entityFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-1">Архив</h1>
      <p className="text-sm text-[#A1A1A1] mb-6">
        Все завершённые задачи — в отличие от журнала изменений, здесь — итоги работы
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value as EntityType | "ALL"); setPage(1); }}
          className="h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
        >
          <option value="ALL">Все типы</option>
          {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
            <option key={t} value={t}>{ENTITY_LABELS[t]}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Всего</p>
          <p className="text-xl font-medium text-[#303030] mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Одобрено</p>
          <p className="text-xl font-medium text-green-700 mt-1">
            {filtered.filter((e) => e.result === "APPROVED").length}
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Отклонено</p>
          <p className="text-xl font-medium text-[#FA6868] mt-1">
            {filtered.filter((e) => e.result === "REJECTED").length}
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1]">Ср. время</p>
          <p className="text-xl font-medium text-[#303030] mt-1">
            {filtered.length
              ? (filtered.reduce((a, b) => a + b.durationDays, 0) / filtered.length).toFixed(1)
              : "—"} дн
          </p>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Тип</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Исполнитель</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Результат</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Срок</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((entry) => {
              const rc = RESULT_CONFIG[entry.result];
              return (
                <tr key={entry.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-[#A1A1A1] whitespace-nowrap">{entry.completedAt}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-[10px] bg-gray-100 text-[#303030] px-1.5 py-0.5 rounded">
                      {ENTITY_LABELS[entry.entityType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#303030] font-medium">{entry.title}</td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">{entry.assignee}</td>
                  <td className="px-4 py-3">
                    <Badge variant={rc.variant}>{rc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden lg:table-cell">{entry.durationDays} дн</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginated.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Записи не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Записи не найдены
          </div>
        ) : (
          paginated.map((entry) => {
            const rc = RESULT_CONFIG[entry.result];
            return (
              <div key={entry.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="text-sm font-medium text-[#303030]">{entry.title}</h3>
                  <Badge variant={rc.variant}>{rc.label}</Badge>
                </div>
                <p className="text-xs text-[#A1A1A1]">
                  {ENTITY_LABELS[entry.entityType]} &middot; {entry.completedAt}
                </p>
                <p className="text-xs text-[#A1A1A1] mt-1">
                  Исполнитель: <span className="text-[#303030]">{entry.assignee}</span> &middot; {entry.durationDays} дн
                </p>
              </div>
            );
          })
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                page === p ? "bg-[#303030] text-white" : "text-[#A1A1A1] hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
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
