"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_KPI_CARD,
  ADMIN_KPI_LABEL,
  ADMIN_KPI_VALUE,
  ADMIN_KPI_DELTA,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_SECTION_TITLE,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────── */

type AdminRole = "MANAGER" | "SUPER_MANAGER" | "ADMIN";

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

interface OverallStats {
  users: { total: number; phoneVerified: number; active: number; inPeriod: number };
  tickets?: { total?: number; open?: number; new?: number };
  orders?: { total?: number; ordered?: number };
  parks?: { total: number; active?: number; draft?: number };
}

interface AuditEntry {
  id: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
}

interface StatCard {
  title: string;
  value: string;
  caption?: string;
  accent?: "yellow" | "green" | "red";
  icon?: React.ReactNode;
}

interface QuickAction {
  label: string;
  href: string;
  description: string;
  roles: AdminRole[];
  icon: React.ReactNode;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Модерация парков",
    href: "/admin/parks",
    description: "Заявки на проверке",
    roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    label: "Пользователи",
    href: "/admin/users",
    description: "База клиентов",
    roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Тикеты",
    href: "/admin/tickets",
    description: "Чат с пользователями",
    roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: "Заказы «По делам»",
    href: "/admin/orders",
    description: "Без 9% комиссии",
    roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <path d="M8 7h8M8 12h8M8 17h4" />
      </svg>
    ),
  },
  {
    label: "Выкуп авто",
    href: "/admin/buyout",
    description: "Объявления",
    roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h8l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2" />
      </svg>
    ),
  },
  {
    label: "Парки",
    href: "/admin/parks-list",
    description: "Управление",
    roles: ["ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
  {
    label: "Менеджеры",
    href: "/admin/managers",
    description: "Команда",
    roles: ["SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Статистика",
    href: "/admin/stats",
    description: "Метрики и графики",
    roles: ["SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    label: "Новости",
    href: "/admin/news",
    description: "Публикации",
    roles: ["SUPER_MANAGER", "ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Настройки сервиса",
    href: "/admin/settings",
    description: "Курсы, баллы, тексты",
    roles: ["ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Обновление",
  DELETE: "Удаление",
  STATUS_CHANGE: "Смена статуса",
};

const ENTITY_LABELS: Record<string, string> = {
  USER: "Пользователь",
  PARK: "Таксопарк",
  CAR: "Автомобиль",
  TICKET: "Тикет",
  POINTS: "Баллы",
  BUYOUT: "Выкуп",
  NEWS: "Новость",
  MANAGER_STATUS: "Статус менеджера",
  BUYOUT_LISTING: "Объявление",
  SETTING: "Настройка",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-[#3BB560]",
  UPDATE: "bg-[#F8D62E]",
  DELETE: "bg-[#FA6868]",
  STATUS_CHANGE: "bg-[#3D7BD9]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.round(hours / 24);
  return `${days} дн. назад`;
}

/* ── page ────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const { user, loading: userLoading } = useAuth();
  const role = (user?.role as AdminRole | undefined) ?? "MANAGER";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
  const firstName = user?.firstName || "";

  const [stats, setStats] = useState<OverallStats | null>(null);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    const tasks: Promise<void>[] = [];

    if (role === "ADMIN" || role === "SUPER_MANAGER") {
      tasks.push(
        api<OverallStats>("/admin/stats/overall", { token })
          .then(setStats)
          .catch(() => setStats(null)),
      );
    }

    tasks.push(
      api<{ data: AuditEntry[] }>("/admin/audit?limit=8&page=1", { token })
        .then((r) => setActivity(r?.data || []))
        .catch(() => setActivity([])),
    );

    Promise.all(tasks).finally(() => setLoading(false));
  }, [user, role]);

  const cards: StatCard[] = (() => {
    if (!stats) return [];
    if (role === "ADMIN" || role === "SUPER_MANAGER") {
      return [
        {
          title: "Пользователей",
          value: String(stats.users?.total ?? 0),
          caption: stats.users?.inPeriod ? `+${stats.users.inPeriod} за период` : "из общего числа",
          accent: "green",
        },
        {
          title: "Активных",
          value: String(stats.users?.active ?? 0),
          caption: "Активность ≤ 30 дн.",
        },
        {
          title: "Парков",
          value: String(stats.parks?.total ?? 0),
          caption: stats.parks?.draft ? `${stats.parks.draft} на модерации` : "В системе",
          accent: stats.parks?.draft ? "yellow" : undefined,
        },
        {
          title: "Тикетов открыто",
          value: String(stats.tickets?.open ?? stats.tickets?.new ?? 0),
          caption: "Требуют ответа",
          accent: "red",
        },
      ];
    }
    return [];
  })();

  const quickActions = QUICK_ACTIONS.filter((q) => q.roles.includes(role));

  if (userLoading) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Главная</p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>
          Добрый день{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          {fullName} · <span className="text-[#1F1F1F] font-medium">{ROLE_LABELS[role] || role}</span>
        </p>
      </div>

      {/* ── KPI Stats ── */}
      {(role === "ADMIN" || role === "SUPER_MANAGER") && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading && cards.length === 0 ? (
            <div className="col-span-full text-sm text-[#A1A1A1]">Загрузка статистики...</div>
          ) : (
            cards.map((s) => (
              <div key={s.title} className={ADMIN_KPI_CARD}>
                <div className="flex items-center justify-between">
                  <span className={ADMIN_KPI_LABEL}>{s.title}</span>
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      s.accent === "yellow"
                        ? "bg-[#FEF7DA] text-[#9A7C00]"
                        : s.accent === "green"
                          ? "bg-[#E8F7EE] text-[#3BB560]"
                          : s.accent === "red"
                            ? "bg-[#FDE8E8] text-[#FA6868]"
                            : "bg-[#F2F2F2] text-[#A1A1A1]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M7 17l9.2-9.2M17 17V7H7" />
                    </svg>
                  </span>
                </div>
                <p className={ADMIN_KPI_VALUE}>{s.value}</p>
                {s.caption && (
                  <p className="text-xs text-[#A1A1A1]">
                    {s.caption.startsWith("+") ? <span className={ADMIN_KPI_DELTA}>{s.caption}</span> : s.caption}
                  </p>
                )}
              </div>
            ))
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Activity feed ── */}
        <section className={`${ADMIN_CARD} lg:col-span-2 p-6`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={ADMIN_SECTION_TITLE}>Последние события</h2>
            {(role === "ADMIN" || role === "SUPER_MANAGER") && (
              <Link href="/admin/audit" className="text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors">
                Все события →
              </Link>
            )}
          </div>
          {loading && activity.length === 0 ? (
            <p className="text-sm text-[#A1A1A1]">Загрузка...</p>
          ) : activity.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#A1A1A1]">
              Нет событий
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-3 border-b border-[#F2F2F2] last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      ACTION_COLORS[a.action] || "bg-[#A1A1A1]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1F1F1F] font-medium">
                      {ACTION_LABELS[a.action] || a.action}
                      <span className="text-[#A1A1A1] font-normal"> · {ENTITY_LABELS[a.entity] || a.entity}</span>
                    </p>
                    <p className="text-[11px] text-[#A1A1A1] mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Quick actions ── */}
        <section className={`${ADMIN_CARD} p-6`}>
          <h2 className={`${ADMIN_SECTION_TITLE} mb-5`}>Быстрые действия</h2>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.slice(0, 8).map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-[12px] border border-[#EFEFEF] hover:border-[#F8D62E] hover:bg-[#FFFBE6] transition-all"
              >
                <span className="w-9 h-9 rounded-[10px] bg-[#F2F2F2] group-hover:bg-[#F8D62E] flex items-center justify-center text-[#1F1F1F] transition-colors shrink-0">
                  {q.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F1F1F] truncate">{q.label}</p>
                  <p className="text-[11px] text-[#A1A1A1] truncate">{q.description}</p>
                </div>
                <svg className="w-4 h-4 text-[#CDCDCD] group-hover:text-[#1F1F1F] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
