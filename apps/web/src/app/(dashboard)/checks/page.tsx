"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── types & mock data ────────────────────────────────── */

type CheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

interface ParkCheck {
  id: string;
  parkName: string;
  status: CheckStatus;
  date: string;
  points: number;
  note?: string;
}

const STATUS_CONFIG: Record<CheckStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "На рассмотрении", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  COMPLETED: { label: "Завершена", variant: "green" },
  REJECTED: { label: "Отклонена", variant: "red" },
};

const MOCK_CHECKS: ParkCheck[] = [
  { id: "1", parkName: "Альфа", status: "COMPLETED", date: "05.03.2026", points: 50, note: "Данные подтверждены, парк опубликован" },
  { id: "2", parkName: "Мега Такси", status: "IN_PROGRESS", date: "10.04.2026", points: 0, note: "Менеджер связывается с парком" },
  { id: "3", parkName: "Драйв Парк", status: "PENDING", date: "14.04.2026", points: 0 },
  { id: "4", parkName: "Голд Такси", status: "COMPLETED", date: "20.02.2026", points: 50 },
  { id: "5", parkName: "Экспресс Парк", status: "REJECTED", date: "03.04.2026", points: 0, note: "Некорректные контактные данные" },
  { id: "6", parkName: "Премьер Авто", status: "COMPLETED", date: "15.02.2026", points: 50 },
];

const FILTERS: Array<{ key: CheckStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Все" },
  { key: "PENDING", label: "На рассмотрении" },
  { key: "IN_PROGRESS", label: "В работе" },
  { key: "COMPLETED", label: "Завершены" },
  { key: "REJECTED", label: "Отклонены" },
];

/* ── page ─────────────────────────────────────────────── */

export default function ChecksPage() {
  const [filter, setFilter] = useState<CheckStatus | "ALL">("ALL");

  const filtered = filter === "ALL" ? MOCK_CHECKS : MOCK_CHECKS.filter((c) => c.status === filter);

  const totalPoints = MOCK_CHECKS.filter((c) => c.status === "COMPLETED").reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">Проверки таксопарков</h1>
        <Link href="/parks/add">
          <Button size="sm">+ Добавить таксопарк</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1] mb-1">Всего проверок</p>
          <p className="text-xl font-medium text-[#303030]">{MOCK_CHECKS.length}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1] mb-1">Завершено</p>
          <p className="text-xl font-medium text-[#303030]">
            {MOCK_CHECKS.filter((c) => c.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-[#F8D62E] rounded-xl p-4">
          <p className="text-xs text-[#303030]/70 mb-1">Заработано баллов</p>
          <p className="text-xl font-medium text-[#303030]">{totalPoints}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
              filter === f.key
                ? "bg-[#303030] text-white"
                : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название парка</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Дата</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Баллы</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const sc = STATUS_CONFIG[c.status];
              return (
                <tr key={c.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#303030] font-medium">{c.parkName}</p>
                    {c.note && <p className="text-xs text-[#A1A1A1] mt-0.5">{c.note}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{c.date}</td>
                  <td className="px-4 py-3 text-right">
                    {c.points > 0 ? (
                      <span className="font-medium text-green-600">+{c.points}</span>
                    ) : (
                      <span className="text-[#A1A1A1]">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Проверок не найдено</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Проверок не найдено
          </div>
        ) : (
          filtered.map((c) => {
            const sc = STATUS_CONFIG[c.status];
            return (
              <div key={c.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-medium text-[#303030]">{c.parkName}</h3>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                {c.note && <p className="text-xs text-[#A1A1A1] mb-2">{c.note}</p>}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1A1]">{c.date}</span>
                  {c.points > 0 ? (
                    <span className="font-medium text-green-600">+{c.points} баллов</span>
                  ) : (
                    <span className="text-[#A1A1A1]">Без баллов</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
