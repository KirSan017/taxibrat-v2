"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── types & mock data ────────────────────────────────── */

type ParkStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface Park {
  id: string;
  name: string;
  rating: number;
  classes: string[];
  status: ParkStatus;
  date: string;
  advertised: boolean;
}

const MOCK_PARKS: Park[] = [
  { id: "1", name: "Таксопарк «Альфа Драйв»", rating: 4.8, classes: ["Эконом", "Комфорт"], status: "ACTIVE", date: "12.04.2026", advertised: true },
  { id: "2", name: "Мега Такси", rating: 4.2, classes: ["Эконом"], status: "ACTIVE", date: "10.04.2026", advertised: false },
  { id: "3", name: "Драйв Парк Москва", rating: 3.9, classes: ["Эконом", "Комфорт", "Бизнес"], status: "DRAFT", date: "08.04.2026", advertised: false },
  { id: "4", name: "Городское Такси", rating: 4.5, classes: ["Комфорт", "Бизнес"], status: "ACTIVE", date: "05.04.2026", advertised: true },
  { id: "5", name: "Экспресс Авто", rating: 3.1, classes: ["Эконом"], status: "ARCHIVED", date: "01.04.2026", advertised: false },
  { id: "6", name: "Премиум Драйвер", rating: 4.7, classes: ["Бизнес", "Премиум"], status: "ACTIVE", date: "28.03.2026", advertised: false },
  { id: "7", name: "Такси Столица", rating: 4.0, classes: ["Эконом", "Комфорт"], status: "DRAFT", date: "25.03.2026", advertised: false },
];

const STATUS_CONFIG: Record<ParkStatus, { label: string; variant: "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminParksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParkStatus | "ALL">("ALL");

  const filtered = MOCK_PARKS.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Таксопарки</h1>
        <Button size="sm">+ Добавить таксопарк</Button>
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

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Рейтинг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Классы</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((park) => {
              const sc = STATUS_CONFIG[park.status];
              return (
                <tr
                  key={park.id}
                  className={`border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors ${
                    park.advertised ? "bg-[#F8D62E]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/parks/${park.id}`} className="text-[#303030] font-medium hover:underline">
                      {park.name}
                    </Link>
                    {park.advertised && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F8D62E] text-[#303030]">
                        AD
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-[#F8D62E]" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {park.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {park.classes.map((c) => (
                        <span key={c} className="text-xs text-[#A1A1A1] bg-gray-100 px-2 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{park.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Таксопарки не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Таксопарки не найдены
          </div>
        ) : (
          filtered.map((park) => {
            const sc = STATUS_CONFIG[park.status];
            return (
              <Link
                key={park.id}
                href={`/admin/parks/${park.id}`}
                className={`block bg-white border rounded-xl p-4 ${
                  park.advertised ? "bg-[#F8D62E]/5 border-[#F8D62E]/40" : "border-[#E5E5E5]"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#303030]">{park.name}</h3>
                    <p className="text-xs text-[#A1A1A1] mt-0.5">{park.date}</p>
                  </div>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-[#303030]">
                    <svg className="w-4 h-4 text-[#F8D62E]" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {park.rating}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {park.classes.map((c) => (
                      <span key={c} className="text-xs text-[#A1A1A1] bg-gray-100 px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
