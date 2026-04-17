"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/* ── types & mock data ────────────────────────────────── */

interface AuditEntry {
  id: string;
  date: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
}

const MOCK_AUDIT: AuditEntry[] = [
  { id: "1", date: "16.04.2026 15:32", actorName: "Алексей Петров", action: "Обновлено", entity: "Таксопарк", entityId: "1", oldValue: "рейтинг: 4.5", newValue: "рейтинг: 4.8" },
  { id: "2", date: "16.04.2026 14:15", actorName: "Мария Козлова", action: "Статус изменён", entity: "Пользователь", entityId: "3", oldValue: "PENDING_REVIEW", newValue: "ACTIVE" },
  { id: "3", date: "16.04.2026 12:48", actorName: "Система", action: "Создано", entity: "Тикет", entityId: "8", oldValue: "-", newValue: "Проверка «Драйв Парк»" },
  { id: "4", date: "15.04.2026 18:22", actorName: "Дмитрий Смирнов", action: "Удалено", entity: "Новость", entityId: "5", oldValue: "Акция завершена", newValue: "-" },
  { id: "5", date: "15.04.2026 16:05", actorName: "Алексей Петров", action: "Одобрено", entity: "Выкуп", entityId: "2", oldValue: "PENDING", newValue: "APPROVED" },
  { id: "6", date: "15.04.2026 11:30", actorName: "Анна Новикова", action: "Обновлено", entity: "Таксопарк", entityId: "3", oldValue: "статус: DRAFT", newValue: "статус: ACTIVE" },
  { id: "7", date: "14.04.2026 09:15", actorName: "Мария Козлова", action: "Статус изменён", entity: "Заказ", entityId: "4", oldValue: "ASSIGNED", newValue: "ORDERED" },
  { id: "8", date: "14.04.2026 08:00", actorName: "Система", action: "Настройки изменены", entity: "Настройки", entityId: "-", oldValue: "points_referral: 80", newValue: "points_referral: 100" },
  { id: "9", date: "13.04.2026 19:45", actorName: "Алексей Петров", action: "Создано", entity: "Новость", entityId: "4", oldValue: "-", newValue: "Техническое обслуживание 20 апреля" },
  { id: "10", date: "13.04.2026 14:20", actorName: "Дмитрий Смирнов", action: "Статус изменён", entity: "Пользователь", entityId: "4", oldValue: "PENDING_REVIEW", newValue: "REJECTED" },
  { id: "11", date: "12.04.2026 10:10", actorName: "Анна Новикова", action: "Обновлено", entity: "Таксопарк", entityId: "2", oldValue: "телефон: +7(495)111-11-11", newValue: "телефон: +7(495)222-22-22" },
  { id: "12", date: "11.04.2026 16:30", actorName: "Система", action: "Создано", entity: "Пользователь", entityId: "8", oldValue: "-", newValue: "Новикова Е.А." },
];

const ITEMS_PER_PAGE = 8;

/* ── page ─────────────────────────────────────────────── */

export default function AdminAuditPage() {
  const [searchEntity, setSearchEntity] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = MOCK_AUDIT.filter((entry) => {
    if (searchEntity && !entry.entity.toLowerCase().includes(searchEntity.toLowerCase())) return false;
    if (searchActor && !entry.actorName.toLowerCase().includes(searchActor.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Архив изменений</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Input
          placeholder="Поиск по сущности..."
          value={searchEntity}
          onChange={(e) => { setSearchEntity(e.target.value); setPage(1); }}
        />
        <Input
          placeholder="Поиск по актору..."
          value={searchActor}
          onChange={(e) => { setSearchActor(e.target.value); setPage(1); }}
        />
        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="От"
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors"
          />
        </div>
        <div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="До"
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors"
          />
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Актор</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Действие</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Сущность</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Было</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Стало</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((entry) => (
              <tr key={entry.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-[#A1A1A1] whitespace-nowrap">{entry.date}</td>
                <td className="px-4 py-3 text-[#303030] font-medium">{entry.actorName}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    entry.action === "Создано" ? "bg-green-100 text-green-700" :
                    entry.action === "Удалено" ? "bg-[#FA6868]/10 text-[#FA6868]" :
                    "bg-gray-100 text-[#A1A1A1]"
                  }`}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#303030] hidden md:table-cell">
                  {entry.entity} #{entry.entityId}
                </td>
                <td className="px-4 py-3 text-[#A1A1A1] hidden lg:table-cell">
                  <span className="text-xs bg-[#FA6868]/5 text-[#FA6868] px-1.5 py-0.5 rounded">{entry.oldValue}</span>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1] hidden lg:table-cell">
                  <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{entry.newValue}</span>
                </td>
              </tr>
            ))}
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
          paginated.map((entry) => (
            <div key={entry.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-sm font-medium text-[#303030]">{entry.actorName}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${
                  entry.action === "Создано" ? "bg-green-100 text-green-700" :
                  entry.action === "Удалено" ? "bg-[#FA6868]/10 text-[#FA6868]" :
                  "bg-gray-100 text-[#A1A1A1]"
                }`}>
                  {entry.action}
                </span>
              </div>
              <p className="text-xs text-[#A1A1A1] mb-2">{entry.date}</p>
              <p className="text-xs text-[#303030] mb-2">
                {entry.entity} #{entry.entityId}
              </p>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="bg-[#FA6868]/5 text-[#FA6868] px-1.5 py-0.5 rounded">{entry.oldValue}</span>
                <span className="text-[#A1A1A1]">&rarr;</span>
                <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{entry.newValue}</span>
              </div>
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
