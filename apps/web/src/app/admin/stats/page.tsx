"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface ManagerStats {
  id: string;
  firstName: string | null;
  lastName: string | null;
  workStatus?: string;
  ticketsTotal?: number;
  ticketsCompleted?: number;
  ticketsInProgress?: number;
  pointsAwarded?: number;
  activeSince?: string;
}

interface OverallStats {
  [key: string]: unknown;
}

interface UsersPoint {
  date: string;
  total: number;
  phoneVerified: number;
  active: number;
}

interface PointsPoint {
  date: string;
  awarded: number;
  spent: number;
}

interface OrdersPoint {
  date: string;
  total: number;
  ordered: number;
  cancelled: number;
}

type GroupBy = "day" | "week" | "month";

function formatDateLabel(iso: string, groupBy: GroupBy) {
  const d = new Date(iso);
  if (groupBy === "month") return d.toLocaleDateString("ru-RU", { year: "numeric", month: "short" });
  if (groupBy === "week") {
    return `${d.toLocaleDateString("ru-RU", { month: "short", day: "2-digit" })}`;
  }
  return d.toLocaleDateString("ru-RU", { month: "short", day: "2-digit" });
}

function BarChart({
  data,
  valueKey,
  color,
  groupBy,
}: {
  data: Array<{ date: string } & Record<string, number | string>>;
  valueKey: string;
  color: string;
  groupBy: GroupBy;
}) {
  if (!data.length) {
    return <p className="text-xs text-[#A1A1A1] py-6 text-center">Нет данных</p>;
  }
  const max = Math.max(...data.map((d) => Number(d[valueKey] ?? 0))) || 1;
  return (
    <div className="flex items-end gap-1 h-[140px] mt-3">
      {data.map((d, i) => {
        const v = Number(d[valueKey] ?? 0);
        const h = Math.max(2, Math.round((v / max) * 120));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]">
            <span className="text-[9px] text-[#A1A1A1]">{v}</span>
            <div className="w-full rounded-t" style={{ height: `${h}px`, backgroundColor: color }} title={`${d.date}: ${v}`} />
            <span className="text-[9px] text-[#A1A1A1] rotate-[-30deg] whitespace-nowrap origin-left">
              {formatDateLabel(d.date as string, groupBy)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminStatsPage() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [usersChart, setUsersChart] = useState<UsersPoint[]>([]);
  const [pointsChart, setPointsChart] = useState<PointsPoint[]>([]);
  const [ordersChart, setOrdersChart] = useState<OrdersPoint[]>([]);

  const isAdmin = user?.role === "ADMIN";

  const loadStats = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");

    const range = new URLSearchParams();
    if (from) range.set("from", from);
    if (to) range.set("to", to);

    const promises: Promise<unknown>[] = [
      api<ManagerStats[]>("/admin/stats/managers", { token })
        .then((res) => setManagers(Array.isArray(res) ? res : []))
        .catch(() => setManagers([])),
    ];

    if (isAdmin) {
      promises.push(
        api<OverallStats>(`/admin/stats/overall?${range.toString()}`, { token })
          .then(setOverall)
          .catch(() => setOverall(null)),
      );

      const chartParams = new URLSearchParams(range.toString());
      chartParams.set("groupBy", groupBy);
      promises.push(
        api<UsersPoint[]>(`/admin/stats/users/chart?${chartParams.toString()}`, { token })
          .then((r) => setUsersChart(Array.isArray(r) ? r : []))
          .catch(() => setUsersChart([])),
        api<PointsPoint[]>(`/admin/stats/points/chart?${chartParams.toString()}`, { token })
          .then((r) => setPointsChart(Array.isArray(r) ? r : []))
          .catch(() => setPointsChart([])),
        api<OrdersPoint[]>(`/admin/stats/orders/chart?${chartParams.toString()}`, { token })
          .then((r) => setOrdersChart(Array.isArray(r) ? r : []))
          .catch(() => setOrdersChart([])),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from, to, groupBy]);

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Статистика</h1>

      {/* Date range */}
      <div className="flex gap-3 mb-6">
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
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">Группировка</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          >
            <option value="day">По дням</option>
            <option value="week">По неделям</option>
            <option value="month">По месяцам</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : (
        <>
          {/* Overall */}
          {isAdmin && overall && (
            <section className="mb-8">
              <h2 className="text-sm font-medium text-[#303030] mb-4">Общая статистика</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(overall).map(([key, value]) => (
                  <div key={key} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                    <p className="text-xs text-[#A1A1A1] mb-1">{key}</p>
                    <p className="text-xl font-medium text-[#303030]">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Charts */}
          {isAdmin && (
            <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#303030] mb-1">Новые пользователи</h3>
                <p className="text-xs text-[#A1A1A1]">Всего за период</p>
                <BarChart data={usersChart as any} valueKey="total" color="#F8D62E" groupBy={groupBy} />
              </div>
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#303030] mb-1">Баллы дружбы</h3>
                <p className="text-xs text-[#A1A1A1]">Начислено</p>
                <BarChart data={pointsChart as any} valueKey="awarded" color="#FA6868" groupBy={groupBy} />
              </div>
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#303030] mb-1">Заказы «По делам»</h3>
                <p className="text-xs text-[#A1A1A1]">Всего</p>
                <BarChart data={ordersChart as any} valueKey="total" color="#303030" groupBy={groupBy} />
              </div>
            </section>
          )}

          {/* Managers */}
          <section>
            <h2 className="text-sm font-medium text-[#303030] mb-4">Менеджеры</h2>
            {managers.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
                Менеджеров нет
              </div>
            ) : (
              <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Менеджер</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Всего</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Завершено</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Баллы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((m) => (
                      <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0">
                        <td className="px-4 py-3 text-[#303030] font-medium">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {m.workStatus === "WORKING" ? (
                            <span className="text-xs text-green-600 font-medium">Работает</span>
                          ) : (
                            <span className="text-xs text-[#A1A1A1]">Отдыхает</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.ticketsTotal ?? 0}</td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.ticketsCompleted ?? 0}</td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.pointsAwarded ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
