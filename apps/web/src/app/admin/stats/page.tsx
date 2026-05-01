"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { TICKET_TOPIC_LABELS, DRIVER_CLASS_LABELS } from "@/lib/labels";
import {
  ADMIN_CARD,
  ADMIN_KPI_CARD,
  ADMIN_KPI_LABEL,
  ADMIN_KPI_VALUE,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_SELECT,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
} from "@/components/admin/admin-styles";

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
  users: "Пользователи",
  points: "Баллы дружбы",
  tickets: "Тикеты по типам",
  orders: "Заказы «По делам»",
  parks: "Таксопарки",
  prices: "Цены по классам",
  buyouts: "Выкуп",
  total: "Всего",
  phoneVerified: "По телефону",
  active: "Активных",
  inPeriod: "За период",
  totalAwarded: "Начислено всего",
  totalSpent: "Списано всего",
  totalBalance: "Текущий баланс",
  ordered: "Заказанных",
  completed: "Завершённых",
  cancelled: "Отменённых",
  banned: "Теневой бан",
  avgCommission: "Средняя комиссия",
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
  if (groupBy === "month")
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "short" });
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
    return <p className="text-xs text-[#A1A1A1] py-12 text-center">Нет данных</p>;
  }
  const max = Math.max(...data.map((d) => Number(d[valueKey] ?? 0))) || 1;
  return (
    <div className="flex items-end gap-1 h-[160px] mt-4">
      {data.map((d, i) => {
        const v = Number(d[valueKey] ?? 0);
        const h = Math.max(2, Math.round((v / max) * 130));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-[20px]">
            <span className="text-[9px] text-[#A1A1A1] font-medium">{v}</span>
            <div
              className="w-full rounded-t-[4px]"
              style={{ height: `${h}px`, backgroundColor: color }}
              title={`${d.date}: ${v}`}
            />
            <span className="text-[9px] text-[#A1A1A1] rotate-[-30deg] whitespace-nowrap origin-left mt-1">
              {formatDateLabel(d.date as string, groupBy)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
    return <p className="text-xs text-[#A1A1A1] py-12 text-center">Нет данных</p>;
  }
  const max =
    Math.max(
      ...data.map((d) => Math.max(Number(d[seriesA.key] ?? 0), Number(d[seriesB.key] ?? 0))),
    ) || 1;

  return (
    <>
      <div className="flex items-center gap-4 text-[11px] text-[#A1A1A1] mt-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ backgroundColor: seriesA.color }}
          />
          {seriesA.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ backgroundColor: seriesB.color }}
          />
          {seriesB.label}
        </span>
      </div>
      <div className="flex items-end gap-2 h-[160px] mt-3">
        {data.map((d, i) => {
          const va = Number(d[seriesA.key] ?? 0);
          const vb = Number(d[seriesB.key] ?? 0);
          const ha = Math.max(2, Math.round((va / max) * 130));
          const hb = Math.max(2, Math.round((vb / max) * 130));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[30px]">
              <div className="flex items-end gap-0.5 w-full justify-center h-[140px]">
                <div
                  className="w-1/2 rounded-t-[4px]"
                  style={{ height: `${ha}px`, backgroundColor: seriesA.color }}
                  title={`${d.date} · ${seriesA.label}: ${va}`}
                />
                <div
                  className="w-1/2 rounded-t-[4px]"
                  style={{ height: `${hb}px`, backgroundColor: seriesB.color }}
                  title={`${d.date} · ${seriesB.label}: ${vb}`}
                />
              </div>
              <span className="text-[9px] text-[#A1A1A1] rotate-[-30deg] whitespace-nowrap origin-left mt-1">
                {formatDateLabel(d.date as string, groupBy)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── helper: KPI tile ─────────────────────────────────── */

function KpiTile({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string | number;
  caption?: string;
  accent?: "yellow" | "green" | "red" | "blue" | "default";
}) {
  const accentClass =
    accent === "yellow"
      ? "bg-[#FEF7DA] text-[#9A7C00]"
      : accent === "green"
        ? "bg-[#E8F7EE] text-[#3BB560]"
        : accent === "red"
          ? "bg-[#FDE8E8] text-[#FA6868]"
          : accent === "blue"
            ? "bg-[#E8F0FE] text-[#3D7BD9]"
            : "bg-[#F2F2F2] text-[#A1A1A1]";

  return (
    <div className={ADMIN_KPI_CARD}>
      <div className="flex items-center justify-between">
        <span className={ADMIN_KPI_LABEL}>{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClass}`}>
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        </span>
      </div>
      <p className={ADMIN_KPI_VALUE}>
        {typeof value === "number" ? value.toLocaleString("ru-RU") : value}
      </p>
      {caption && <p className="text-xs text-[#A1A1A1]">{caption}</p>}
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

  // Top KPIs derived from overall
  const topKpis = (() => {
    if (!overall) return [];
    const u = overall.users as { total?: number; phoneVerified?: number; active?: number; inPeriod?: number } | undefined;
    const p = overall.parks as { total?: number; active?: number; draft?: number } | undefined;
    const t = overall.tickets as { total?: number; open?: number; pending?: number } | undefined;
    const o = overall.orders as { total?: number; ordered?: number; completed?: number } | undefined;
    const pts = overall.points as { totalAwarded?: number; totalBalance?: number } | undefined;
    return [
      { label: "Пользователей", value: u?.total ?? 0, caption: u?.inPeriod ? `+${u.inPeriod} за период` : "из общего числа", accent: "green" as const },
      { label: "Парков", value: p?.total ?? 0, caption: p?.active ? `${p.active} активных` : "В системе", accent: "yellow" as const },
      { label: "Тикетов", value: t?.total ?? 0, caption: t?.open ? `${t.open} открыто` : "В обработке", accent: "blue" as const },
      { label: "Заказов «По делам»", value: o?.total ?? 0, caption: o?.completed ? `${o.completed} завершено` : "Всего", accent: "default" as const },
      { label: "Баллов начислено", value: pts?.totalAwarded ?? 0, caption: "Всего за период", accent: "red" as const },
      { label: "Баланс системы", value: pts?.totalBalance ?? 0, caption: "Текущий", accent: "default" as const },
    ];
  })();

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Аналитика</p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>Статистика</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Метрики, графики, активность команды
        </p>
      </div>

      {/* ── Date range filters ── */}
      <div className={`${ADMIN_CARD} p-4 md:p-5 mb-6 flex flex-wrap gap-4`}>
        <div>
          <label className={ADMIN_LABEL}>От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-[44px] px-4 border border-[#E5E5E5] rounded-[10px] text-sm bg-white text-[#1F1F1F] focus:border-[#F8D62E] focus:outline-none"
          />
        </div>
        <div>
          <label className={ADMIN_LABEL}>До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-[44px] px-4 border border-[#E5E5E5] rounded-[10px] text-sm bg-white text-[#1F1F1F] focus:border-[#F8D62E] focus:outline-none"
          />
        </div>
        <div className="min-w-[180px]">
          <label className={ADMIN_LABEL}>Группировка</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className={ADMIN_SELECT}
          >
            <option value="day">По дням</option>
            <option value="week">По неделям</option>
            <option value="month">По месяцам</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : (
        <>
          {/* ── Top KPI Cards ── */}
          {isAdmin && overall && topKpis.length > 0 && (
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              {topKpis.map((k) => (
                <KpiTile key={k.label} {...k} />
              ))}
            </section>
          )}

          {/* ── Charts ── */}
          {isAdmin && (
            <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className={`${ADMIN_CARD} p-5`}>
                <h3 className={ADMIN_SECTION_TITLE}>Пользователи</h3>
                <p className="text-xs text-[#A1A1A1] mt-1">Верифицированы и активны</p>
                <GroupedBarChart
                  data={usersChart as any}
                  seriesA={{ key: "phoneVerified", color: "#F8D62E", label: "Верифиц." }}
                  seriesB={{ key: "active", color: "#1F1F1F", label: "Активные" }}
                  groupBy={groupBy}
                />
              </div>
              <div className={`${ADMIN_CARD} p-5`}>
                <h3 className={ADMIN_SECTION_TITLE}>Баллы дружбы</h3>
                <p className="text-xs text-[#A1A1A1] mt-1">Начислено</p>
                <BarChart data={pointsChart as any} valueKey="awarded" color="#FA6868" groupBy={groupBy} />
              </div>
              <div className={`${ADMIN_CARD} p-5`}>
                <h3 className={ADMIN_SECTION_TITLE}>Заказы «По делам»</h3>
                <p className="text-xs text-[#A1A1A1] mt-1">Всего</p>
                <BarChart data={ordersChart as any} valueKey="total" color="#3BB560" groupBy={groupBy} />
              </div>
            </section>
          )}

          {/* ── Сегодня (parks breakdown) ── */}
          {isAdmin && overall?.parksTodayBreakdown ? (
            (() => {
              const b = overall.parksTodayBreakdown as {
                total: number;
                draft: number;
                pendingReview: number;
                active: number;
              };
              return (
                <section className={`${ADMIN_CARD} p-6 mb-8`}>
                  <h3 className={ADMIN_SECTION_TITLE}>Сегодня · таксопарки</h3>
                  <p className="text-xs text-[#A1A1A1] mt-1 mb-5">Заявки и статусы за день</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#FAFAFA] rounded-[14px] p-4">
                      <p className="text-xs text-[#A1A1A1] mb-1">Всего за сегодня</p>
                      <p className="text-2xl font-semibold text-[#1F1F1F]">{b.total}</p>
                    </div>
                    <div className="bg-[#FAFAFA] rounded-[14px] p-4">
                      <p className="text-xs text-[#A1A1A1] mb-1">У менеджера</p>
                      <p className="text-2xl font-semibold text-[#1F1F1F]">{b.draft}</p>
                    </div>
                    <div className="bg-[#FEF7DA] rounded-[14px] p-4">
                      <p className="text-xs text-[#9A7C00] mb-1">На проверке СМ</p>
                      <p className="text-2xl font-semibold text-[#1F1F1F]">{b.pendingReview}</p>
                    </div>
                    <div className="bg-[#E8F7EE] rounded-[14px] p-4">
                      <p className="text-xs text-[#3BB560] mb-1">Одобрено</p>
                      <p className="text-2xl font-semibold text-[#1F1F1F]">{b.active}</p>
                    </div>
                  </div>
                </section>
              );
            })()
          ) : null}

          {/* ── Other overall sections ── */}
          {isAdmin && overall && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              {/* Tickets / orders / etc. as nested objects */}
              {Object.entries(overall).map(([key, value]) => {
                if (
                  ["parksTodayBreakdown", "usersCarBrands", "usersByCarClass", "users", "parks", "tickets", "orders", "points"].includes(
                    key,
                  ) &&
                  Array.isArray(value)
                ) {
                  // proceed below
                } else if (
                  ["users", "parks", "tickets", "orders", "points"].includes(key)
                ) {
                  return null; // covered by topKpis
                }
                if (["parksTodayBreakdown", "usersCarBrands", "usersByCarClass"].includes(key)) {
                  return null;
                }
                const label = OVERALL_LABELS[key] ?? key;

                if (Array.isArray(value)) {
                  return (
                    <div key={key} className={`${ADMIN_CARD} p-6`}>
                      <h3 className={ADMIN_SECTION_TITLE}>{label}</h3>
                      {value.length === 0 ? (
                        <p className="text-xs text-[#A1A1A1] mt-3">Нет данных</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {value.map((item: any, idx: number) => {
                            const itemLabel = item.topic
                              ? TICKET_TOPIC_LABELS[item.topic] ?? item.topic
                              : item.driverClass
                                ? DRIVER_CLASS_LABELS[item.driverClass] ?? item.driverClass
                                : `Элемент ${idx + 1}`;
                            const itemValue =
                              item.total ?? item.avgRentPrice ?? item.avg ?? item.value ?? "—";
                            return (
                              <div key={idx} className="bg-[#FAFAFA] rounded-[12px] p-3">
                                <p className="text-xs text-[#A1A1A1] mb-1 truncate">{itemLabel}</p>
                                <p className="text-base font-semibold text-[#1F1F1F]">
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
                    </div>
                  );
                }

                if (value && typeof value === "object") {
                  const entries = Object.entries(value as Record<string, unknown>);
                  return (
                    <div key={key} className={`${ADMIN_CARD} p-6`}>
                      <h3 className={ADMIN_SECTION_TITLE}>{label}</h3>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {entries.map(([innerKey, innerValue]) => (
                          <div key={innerKey} className="bg-[#FAFAFA] rounded-[12px] p-3">
                            <p className="text-xs text-[#A1A1A1] mb-1">
                              {OVERALL_LABELS[innerKey] ?? innerKey}
                            </p>
                            <p className="text-lg font-semibold text-[#1F1F1F]">
                              {formatStatValue(innerValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </section>
          )}

          {/* ── Brands ── */}
          {isAdmin &&
            Array.isArray(overall?.usersCarBrands) &&
            (overall.usersCarBrands as any[]).length > 0 && (
              <section className={`${ADMIN_CARD} p-6 mb-8`}>
                <h3 className={ADMIN_SECTION_TITLE}>Марки авто пользователей</h3>
                <p className="text-xs text-[#A1A1A1] mt-1 mb-4">Топ-10 по количеству</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(overall.usersCarBrands as any[]).slice(0, 10).map((b, idx) => (
                    <div key={idx} className="bg-[#FAFAFA] rounded-[12px] p-3">
                      <p className="text-xs text-[#A1A1A1] mb-1 truncate">{b.brandName}</p>
                      <p className="text-base font-semibold text-[#1F1F1F]">
                        {Number(b.count).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* ── By car class ── */}
          {isAdmin &&
            Array.isArray(overall?.usersByCarClass) &&
            (overall.usersByCarClass as any[]).length > 0 && (
              <section className={`${ADMIN_CARD} p-6 mb-8`}>
                <h3 className={ADMIN_SECTION_TITLE}>Пользователи по классу авто</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {(overall.usersByCarClass as any[]).map((c, idx) => (
                    <div key={idx} className="bg-[#FAFAFA] rounded-[12px] p-3">
                      <p className="text-xs text-[#A1A1A1] mb-1">
                        {DRIVER_CLASS_LABELS[c.carClass] ?? c.carClass ?? "—"}
                      </p>
                      <p className="text-xl font-semibold text-[#1F1F1F]">
                        {Number(c.count).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* ── Managers table ── */}
          <section>
            <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>Менеджеры</h2>
            {managers.length === 0 ? (
              <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
                Менеджеров нет
              </div>
            ) : (
              <div className={`${ADMIN_CARD} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className={ADMIN_TABLE_HEADER}>Менеджер</th>
                        <th className={ADMIN_TABLE_HEADER}>Статус</th>
                        <th className={`${ADMIN_TABLE_HEADER} text-right`}>Всего</th>
                        <th className={`${ADMIN_TABLE_HEADER} text-right`}>Завершено</th>
                        <th className={`${ADMIN_TABLE_HEADER} text-right`}>Баллы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map((m) => (
                        <tr key={m.id} className={ADMIN_TABLE_ROW}>
                          <td className={`${ADMIN_TABLE_CELL} font-medium`}>
                            {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className={ADMIN_TABLE_CELL}>
                            {m.workStatus === "WORKING" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#3BB560] font-medium">
                                <span className="w-2 h-2 rounded-full bg-[#3BB560]" />
                                Работает
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1]">
                                <span className="w-2 h-2 rounded-full bg-[#CDCDCD]" />
                                Отдыхает
                              </span>
                            )}
                          </td>
                          <td className={`${ADMIN_TABLE_CELL} text-right`}>{m.ticketsTotal ?? 0}</td>
                          <td className={`${ADMIN_TABLE_CELL} text-right`}>
                            {m.ticketsCompleted ?? 0}
                          </td>
                          <td className={`${ADMIN_TABLE_CELL} text-right font-medium`}>
                            {m.pointsAwarded ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
