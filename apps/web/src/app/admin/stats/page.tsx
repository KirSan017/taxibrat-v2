"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { TICKET_TOPIC_LABELS, DRIVER_CLASS_LABELS } from "@/lib/labels";

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

const OVERALL_LABELS: Record<string, string> = {
  // Top-level sections
  users: "Пользователи",
  points: "Баллы дружбы",
  tickets: "Тикеты по типам",
  orders: "Заказы «По делам»",
  parks: "Таксопарки",
  prices: "Цены по классам",
  buyouts: "Выкуп",
  // Inner keys (users)
  total: "Всего",
  phoneVerified: "По телефону",
  active: "Активных",
  inPeriod: "За период",
  // Inner keys (points)
  totalAwarded: "Начислено всего",
  totalSpent: "Списано всего",
  totalBalance: "Текущий баланс системы",
  // Inner keys (orders)
  ordered: "Заказанных",
  completed: "Завершённых",
  cancelled: "Отменённых",
  banned: "Теневой бан",
  // Inner keys (parks)
  avgCommission: "Средняя комиссия",
  // Generic
  open: "Открытых",
  pending: "Ожидающих",
  awarded: "Начислено",
  spent: "Списано",
};

function formatStatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("ru-RU");
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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

/**
 * Grouped bar chart: 2 bars per date (две серии рядом).
 */
function GroupedBarChart({
  data,
  seriesA,
  seriesB,
  groupBy,
}: {
  data: Array<{ date: string } & Record<string, number | string>>;
  seriesA: { key: string; color: string; label: string };
  seriesB: { key: string; color: string; label: string };
  groupBy: GroupBy;
}) {
  if (!data.length) {
    return <p className="text-xs text-[#A1A1A1] py-6 text-center">Нет данных</p>;
  }
  const max =
    Math.max(
      ...data.map((d) => Math.max(Number(d[seriesA.key] ?? 0), Number(d[seriesB.key] ?? 0))),
    ) || 1;

  return (
    <>
      <div className="flex items-center gap-3 text-[11px] text-[#A1A1A1] mt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: seriesA.color }} />
          {seriesA.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: seriesB.color }} />
          {seriesB.label}
        </span>
      </div>
      <div className="flex items-end gap-2 h-[140px] mt-2">
        {data.map((d, i) => {
          const va = Number(d[seriesA.key] ?? 0);
          const vb = Number(d[seriesB.key] ?? 0);
          const ha = Math.max(2, Math.round((va / max) * 110));
          const hb = Math.max(2, Math.round((vb / max) * 110));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[30px]">
              <div className="flex items-end gap-0.5 w-full justify-center h-[120px]">
                <div
                  className="w-1/2 rounded-t"
                  style={{ height: `${ha}px`, backgroundColor: seriesA.color }}
                  title={`${d.date} · ${seriesA.label}: ${va}`}
                />
                <div
                  className="w-1/2 rounded-t"
                  style={{ height: `${hb}px`, backgroundColor: seriesB.color }}
                  title={`${d.date} · ${seriesB.label}: ${vb}`}
                />
              </div>
              <span className="text-[9px] text-[#A1A1A1] rotate-[-30deg] whitespace-nowrap origin-left">
                {formatDateLabel(d.date as string, groupBy)}
              </span>
            </div>
          );
        })}
      </div>
    </>
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
                {Object.entries(overall).flatMap(([key, value]) => {
                  const label = OVERALL_LABELS[key] ?? key;

                  // ARRAY (like tickets by topic, prices by class)
                  if (Array.isArray(value)) {
                    return [
                      <section
                        key={key}
                        className="col-span-2 md:col-span-4 bg-white border border-[#E5E5E5] rounded-xl p-4"
                      >
                        <h3 className="text-sm font-medium text-[#303030] mb-3">{label}</h3>
                        {value.length === 0 ? (
                          <p className="text-xs text-[#A1A1A1]">Нет данных</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {value.map((item: any, idx: number) => {
                              const itemLabel = item.topic
                                ? TICKET_TOPIC_LABELS[item.topic] ?? item.topic
                                : item.driverClass
                                ? DRIVER_CLASS_LABELS[item.driverClass] ?? item.driverClass
                                : `Элемент ${idx + 1}`;
                              const itemValue =
                                item.total ?? item.avgRentPrice ?? item.avg ?? item.value ?? "—";
                              return (
                                <div key={idx} className="bg-[#F3F1E7] rounded-lg p-3">
                                  <p className="text-xs text-[#A1A1A1] mb-1">{itemLabel}</p>
                                  <p className="text-base font-medium text-[#303030]">
                                    {typeof itemValue === "number"
                                      ? itemValue.toLocaleString("ru-RU")
                                      : String(itemValue)}
                                  </p>
                                  {item.completed !== undefined && (
                                    <p className="text-[10px] text-[#A1A1A1] mt-1">
                                      Завершено: {item.completed}
                                    </p>
                                  )}
                                  {item.vehicleCount !== undefined && (
                                    <p className="text-[10px] text-[#A1A1A1] mt-1">
                                      Авто: {item.vehicleCount}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>,
                    ];
                  }

                  // OBJECT (like users, orders)
                  if (value && typeof value === "object") {
                    return Object.entries(value as Record<string, unknown>).map(
                      ([innerKey, innerValue]) => (
                        <div
                          key={`${key}.${innerKey}`}
                          className="bg-white border border-[#E5E5E5] rounded-xl p-4"
                        >
                          <p className="text-xs text-[#A1A1A1] mb-1">
                            {label} · {OVERALL_LABELS[innerKey] ?? innerKey}
                          </p>
                          <p className="text-xl font-medium text-[#303030]">
                            {formatStatValue(innerValue)}
                          </p>
                        </div>
                      ),
                    );
                  }

                  // PRIMITIVE
                  return [
                    <div key={key} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                      <p className="text-xs text-[#A1A1A1] mb-1">{label}</p>
                      <p className="text-xl font-medium text-[#303030]">
                        {formatStatValue(value)}
                      </p>
                    </div>,
                  ];
                })}
              </div>
            </section>
          )}

          {/* Charts */}
          {isAdmin && (
            <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#303030] mb-1">Пользователи</h3>
                <p className="text-xs text-[#A1A1A1]">Верифицированы и активны</p>
                <GroupedBarChart
                  data={usersChart as any}
                  seriesA={{ key: "phoneVerified", color: "#F8D62E", label: "Верифиц." }}
                  seriesB={{ key: "active", color: "#303030", label: "Активные" }}
                  groupBy={groupBy}
                />
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
