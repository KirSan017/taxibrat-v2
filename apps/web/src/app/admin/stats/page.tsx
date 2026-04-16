"use client";

import { useState } from "react";

/* ── types & mock data ────────────────────────────────── */

interface ManagerStats {
  id: string;
  name: string;
  ticketsResolved: number;
  ordersProcessed: number;
  avgResponseMin: number;
  fiveMinCount: number;
  banCount: number;
}

const MOCK_MANAGERS: ManagerStats[] = [
  { id: "1", name: "Алексей Петров", ticketsResolved: 45, ordersProcessed: 120, avgResponseMin: 8, fiveMinCount: 3, banCount: 2 },
  { id: "2", name: "Мария Козлова", ticketsResolved: 38, ordersProcessed: 95, avgResponseMin: 12, fiveMinCount: 7, banCount: 5 },
  { id: "3", name: "Дмитрий Смирнов", ticketsResolved: 52, ordersProcessed: 140, avgResponseMin: 6, fiveMinCount: 1, banCount: 1 },
  { id: "4", name: "Анна Новикова", ticketsResolved: 29, ordersProcessed: 78, avgResponseMin: 15, fiveMinCount: 10, banCount: 8 },
];

interface DetailedStats {
  period: string;
  ticketsResolved: number;
  ordersProcessed: number;
  avgResponseMin: number;
  fiveMinCount: number;
}

const MOCK_DETAILED: DetailedStats[] = [
  { period: "Неделя 1", ticketsResolved: 12, ordersProcessed: 30, avgResponseMin: 7, fiveMinCount: 1 },
  { period: "Неделя 2", ticketsResolved: 15, ordersProcessed: 35, avgResponseMin: 8, fiveMinCount: 0 },
  { period: "Неделя 3", ticketsResolved: 10, ordersProcessed: 28, avgResponseMin: 9, fiveMinCount: 2 },
  { period: "Неделя 4", ticketsResolved: 8, ordersProcessed: 27, avgResponseMin: 6, fiveMinCount: 0 },
];

/* ── overall stats (admin only) ───────────────────────── */
const OVERALL = {
  totalUsers: 1247,
  totalPoints: 45890,
  totalOrders: 3421,
  totalParks: 156,
  activeParks: 89,
  pendingReviews: 23,
};

/* ── mock role ────────────────────────────────────────── */
const MOCK_ROLE = "ADMIN" as "SUPER_MANAGER" | "ADMIN";

/* ── simple bar chart ─────────────────────────────────── */

function BarChart({ data, maxValue, color }: { data: { label: string; value: number }[]; maxValue: number; color: string }) {
  return (
    <div className="flex items-end gap-2 h-[120px]">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-[#303030] font-medium">{d.value}</span>
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max((d.value / maxValue) * 100, 4)}%`,
              backgroundColor: color,
            }}
          />
          <span className="text-[10px] text-[#A1A1A1] truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminStatsPage() {
  const [selectedManager, setSelectedManager] = useState<ManagerStats | null>(null);
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "quarter">("month");

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Статистика</h1>

      {/* Overall stats (admin only) */}
      {MOCK_ROLE === "ADMIN" && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-[#A1A1A1] uppercase tracking-wider mb-3">Общая статистика</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Пользователи", value: OVERALL.totalUsers },
              { label: "Баллы выдано", value: OVERALL.totalPoints },
              { label: "Заказов", value: OVERALL.totalOrders },
              { label: "Таксопарков", value: OVERALL.totalParks },
              { label: "Активных парков", value: OVERALL.activeParks },
              { label: "На проверке", value: OVERALL.pendingReviews },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-[#E5E5E5] p-4">
                <p className="text-2xl font-medium text-[#303030]">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-[#A1A1A1] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manager detail view */}
      {selectedManager ? (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedManager(null)}
              className="text-[#A1A1A1] hover:text-[#303030] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12,19 5,12 12,5" />
              </svg>
            </button>
            <h2 className="text-base font-medium text-[#303030]">{selectedManager.name}</h2>
          </div>

          {/* Time filter */}
          <div className="flex gap-2 mb-6">
            {(["week", "month", "quarter"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  timeFilter === f
                    ? "bg-[#303030] text-white"
                    : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
                }`}
              >
                {f === "week" ? "Неделя" : f === "month" ? "Месяц" : "Квартал"}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
              <h3 className="text-sm font-medium text-[#303030] mb-3">Тикеты решено</h3>
              <BarChart
                data={MOCK_DETAILED.map((d) => ({ label: d.period, value: d.ticketsResolved }))}
                maxValue={20}
                color="#F8D62E"
              />
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
              <h3 className="text-sm font-medium text-[#303030] mb-3">Заказов обработано</h3>
              <BarChart
                data={MOCK_DETAILED.map((d) => ({ label: d.period, value: d.ordersProcessed }))}
                maxValue={40}
                color="#303030"
              />
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
              <h3 className="text-sm font-medium text-[#303030] mb-3">Среднее время ответа (мин)</h3>
              <BarChart
                data={MOCK_DETAILED.map((d) => ({ label: d.period, value: d.avgResponseMin }))}
                maxValue={15}
                color="#A1A1A1"
              />
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
              <h3 className="text-sm font-medium text-[#303030] mb-3">Нажатий «5 мин»</h3>
              <BarChart
                data={MOCK_DETAILED.map((d) => ({ label: d.period, value: d.fiveMinCount }))}
                maxValue={5}
                color="#FA6868"
              />
            </div>
          </div>
        </section>
      ) : (
        /* Manager list */
        <section>
          <h2 className="text-sm font-medium text-[#A1A1A1] uppercase tracking-wider mb-3">Менеджеры</h2>
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Менеджер</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Тикеты</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Заказы</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Ср. ответ</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">5 мин</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Баны</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MANAGERS.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedManager(m)}
                  >
                    <td className="px-4 py-3 text-[#303030] font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-[#303030]">{m.ticketsResolved}</td>
                    <td className="px-4 py-3 text-[#303030] hidden sm:table-cell">{m.ordersProcessed}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={m.avgResponseMin > 10 ? "text-[#FA6868]" : "text-[#303030]"}>
                        {m.avgResponseMin} мин
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={m.fiveMinCount > 5 ? "text-[#FA6868] font-medium" : "text-[#303030]"}>
                        {m.fiveMinCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#303030] hidden lg:table-cell">{m.banCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
