"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { TICKET_TOPIC_LABELS } from "@/lib/labels";
import {
  ADMIN_CARD,
  ADMIN_KPI_CARD,
  ADMIN_KPI_LABEL,
  ADMIN_KPI_VALUE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface ManagerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  createdAt: string;
}

interface TicketByTopic {
  topic: string;
  total: number;
  completed: number;
  rejected?: number;
}

interface FirstResponseTime {
  under30s: number;
  s30To1m: number;
  over1m: number;
  avgSeconds?: number;
}

interface OrderResponseBuckets {
  total?: number;
  under1m: number;
  m1To2: number;
  m2To3: number;
  over3m: number;
  avgSeconds?: number;
}

interface ManagerStatsDetail {
  ticketsByTopic?: TicketByTopic[];
  firstResponseTime?: FirstResponseTime;
  orderResponseBuckets?: OrderResponseBuckets;
  smRejections?: number;
}

const ROLE_LABELS: Record<string, string> = {
  USER: "Пользователь",
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f || l) return `${l.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return "?";
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-32 text-[#A1A1A1] text-xs shrink-0">{label}</div>
      <div className="flex-1 h-7 bg-[#F4F4F4] rounded-[8px] overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-[#F8D62E] transition-all rounded-[8px]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-right text-[#1F1F1F] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminManagerDetailPage() {
  const params = useParams();
  const managerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [manager, setManager] = useState<ManagerDetail | null>(null);
  const [stats, setStats] = useState<ManagerStatsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!managerId || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<ManagerDetail>(`/admin/users/${managerId}`, { token })
        .then(setManager)
        .catch(() => {}),
      api<ManagerStatsDetail>(`/admin/stats/managers/${managerId}`, { token })
        .then(setStats)
        .catch(() => {}),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [managerId, user]);

  if (loading) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error || !manager) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error || "Менеджер не найден"}</p>
        <Link
          href="/admin/managers"
          className="text-xs text-[#1F1F1F] underline mt-2 inline-block"
        >
          К списку менеджеров
        </Link>
      </div>
    );
  }

  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="max-w-[1100px]">
      {/* ── Breadcrumb ── */}
      <Link
        href="/admin/managers"
        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку менеджеров
      </Link>

      {/* ── Header ── */}
      <div className={`${ADMIN_CARD} p-6 mb-5`}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F8D62E] flex items-center justify-center text-lg font-semibold text-[#1F1F1F] shrink-0">
            {getInitials(manager.firstName, manager.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={ADMIN_PAGE_TITLE}>{name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm text-[#A1A1A1]">{manager.phone}</span>
              <span
                className={statusBadgeClass(manager.status === "ACTIVE" ? "green" : "grey")}
              >
                {manager.status === "ACTIVE" ? "Активен" : manager.status}
              </span>
              <span className="inline-flex items-center px-2.5 h-[24px] rounded-full text-[11px] font-semibold bg-[#1F1F1F] text-white">
                {ROLE_LABELS[manager.role] || manager.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile section ── */}
      <section className={`${ADMIN_CARD} p-5 md:p-6 mb-5`}>
        <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>Профиль</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Телефон
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">{manager.phone}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Email
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">{manager.email || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Роль
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">
              {ROLE_LABELS[manager.role] || manager.role}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Дата регистрации
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">
              {new Date(manager.createdAt).toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>
      </section>

      {stats && (
        <div className="space-y-5">
          {/* ── Stat cards ── */}
          {(typeof stats.smRejections === "number" ||
            stats.firstResponseTime?.avgSeconds ||
            stats.orderResponseBuckets?.avgSeconds) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {typeof stats.smRejections === "number" && (
                <div className={ADMIN_KPI_CARD}>
                  <span className={ADMIN_KPI_LABEL}>Доработок от СМ</span>
                  <p className={ADMIN_KPI_VALUE}>{stats.smRejections}</p>
                </div>
              )}
              {typeof stats.firstResponseTime?.avgSeconds === "number" &&
                stats.firstResponseTime.avgSeconds > 0 && (
                  <div className={ADMIN_KPI_CARD}>
                    <span className={ADMIN_KPI_LABEL}>Сред. ответ в чате</span>
                    <p className={ADMIN_KPI_VALUE}>
                      {stats.firstResponseTime.avgSeconds}{" "}
                      <span className="text-[18px] text-[#A1A1A1] font-normal">сек</span>
                    </p>
                  </div>
                )}
              {typeof stats.orderResponseBuckets?.avgSeconds === "number" &&
                stats.orderResponseBuckets.avgSeconds > 0 && (
                  <div className={ADMIN_KPI_CARD}>
                    <span className={ADMIN_KPI_LABEL}>Сред. время «По делам»</span>
                    <p className={ADMIN_KPI_VALUE}>
                      {stats.orderResponseBuckets.avgSeconds}{" "}
                      <span className="text-[18px] text-[#A1A1A1] font-normal">сек</span>
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* ── Tickets by topic ── */}
          {stats.ticketsByTopic && stats.ticketsByTopic.length > 0 && (
            <section className={`${ADMIN_CARD} p-5 md:p-6`}>
              <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>Тикеты по темам</h2>
              <div className="overflow-x-auto -mx-5 md:-mx-6">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={ADMIN_TABLE_HEADER}>Тема</th>
                      <th className={`${ADMIN_TABLE_HEADER} text-right`}>Всего</th>
                      <th className={`${ADMIN_TABLE_HEADER} text-right`}>Завершено</th>
                      <th className={`${ADMIN_TABLE_HEADER} text-right`}>Отклонено СМ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ticketsByTopic.map((row) => (
                      <tr key={row.topic} className={ADMIN_TABLE_ROW}>
                        <td className={ADMIN_TABLE_CELL}>
                          {TICKET_TOPIC_LABELS[row.topic] || row.topic}
                        </td>
                        <td className={`${ADMIN_TABLE_CELL} text-right font-medium`}>
                          {row.total}
                        </td>
                        <td className={`${ADMIN_TABLE_CELL} text-right text-[#3BB560] font-medium`}>
                          {row.completed}
                        </td>
                        <td className={`${ADMIN_TABLE_CELL} text-right text-[#FA6868] font-medium`}>
                          {row.rejected ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── First response ── */}
          {stats.firstResponseTime && (
            <section className={`${ADMIN_CARD} p-5 md:p-6`}>
              <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>Скорость ответа в чатах</h2>
              {(() => {
                const fr = stats.firstResponseTime!;
                const max = Math.max(fr.under30s, fr.s30To1m, fr.over1m, 1);
                return (
                  <div className="space-y-2.5">
                    <BarRow label="до 30 сек" value={fr.under30s} max={max} />
                    <BarRow label="30 сек — 1 мин" value={fr.s30To1m} max={max} />
                    <BarRow label="более 1 мин" value={fr.over1m} max={max} />
                  </div>
                );
              })()}
            </section>
          )}

          {/* ── Order response ── */}
          {stats.orderResponseBuckets && (
            <section className={`${ADMIN_CARD} p-5 md:p-6`}>
              <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>
                Время выполнения заказов «По делам»
              </h2>
              {(() => {
                const ob = stats.orderResponseBuckets!;
                const max = Math.max(ob.under1m, ob.m1To2, ob.m2To3, ob.over3m, 1);
                return (
                  <div className="space-y-2.5">
                    <BarRow label="до 1 мин" value={ob.under1m} max={max} />
                    <BarRow label="1 — 2 мин" value={ob.m1To2} max={max} />
                    <BarRow label="2 — 3 мин" value={ob.m2To3} max={max} />
                    <BarRow label="более 3 мин" value={ob.over3m} max={max} />
                  </div>
                );
              })()}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
