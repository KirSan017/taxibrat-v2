"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

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
}

interface QuickAction {
  label: string;
  href: string;
  roles: AdminRole[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Модерация парков", href: "/admin/parks", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Пользователи", href: "/admin/users", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Тикеты", href: "/admin/tickets", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Заказы «По делам»", href: "/admin/orders", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Выкуп авто", href: "/admin/buyout", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Парки (управление)", href: "/admin/parks-list", roles: ["ADMIN"] },
  { label: "Менеджеры", href: "/admin/managers", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Новости", href: "/admin/news", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Сотрудничество", href: "/admin/cooperation", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Аудит", href: "/admin/audit", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Статистика", href: "/admin/stats", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Рейтинг (настройки)", href: "/admin/rating", roles: ["ADMIN"] },
  { label: "Настройки сервиса", href: "/admin/settings", roles: ["ADMIN"] },
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
  const fullName = [user?.lastName, user?.firstName].filter(Boolean).join(" ") || "—";

  const [stats, setStats] = useState<OverallStats | null>(null);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    const tasks: Promise<void>[] = [];

    if (role === "ADMIN") {
      tasks.push(
        api<OverallStats>("/admin/stats/overall", { token })
          .then(setStats)
          .catch(() => setStats(null))
      );
    }

    tasks.push(
      api<{ data: AuditEntry[] }>("/admin/audit?limit=10&page=1", { token })
        .then((r) => setActivity(r?.data || []))
        .catch(() => setActivity([]))
    );

    Promise.all(tasks).finally(() => setLoading(false));
  }, [user, role]);

  const cards: StatCard[] = (() => {
    if (!stats) return [];
    if (role === "ADMIN") {
      return [
        {
          title: "Пользователей",
          value: String(stats.users?.total ?? 0),
          caption: stats.users?.inPeriod ? `+${stats.users.inPeriod} за период` : undefined,
          accent: "green",
        },
        {
          title: "Активных",
          value: String(stats.users?.active ?? 0),
          caption: "из общего числа",
        },
        {
          title: "Парков",
          value: String(stats.parks?.total ?? 0),
          caption: stats.parks?.draft ? `${stats.parks.draft} на модерации` : undefined,
        },
        {
          title: "Тикетов открыто",
          value: String(stats.tickets?.open ?? stats.tickets?.new ?? 0),
          accent: "yellow",
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
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider">Админ-панель</p>
        <h1 className="text-xl md:text-2xl font-medium text-[#303030] mt-1">
          Добрый день, {fullName}
        </h1>
        <p className="text-sm text-[#A1A1A1] mt-1">
          Роль: <span className="text-[#303030] font-medium">{ROLE_LABELS[role] || role}</span>
        </p>
      </div>

      {/* Stats (admin only) */}
      {role === "ADMIN" && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {loading && cards.length === 0 ? (
            <div className="col-span-full text-sm text-[#A1A1A1]">Загрузка статистики...</div>
          ) : (
            cards.map((s) => (
              <div
                key={s.title}
                className={`rounded-xl border p-4 ${
                  s.accent === "yellow"
                    ? "bg-[#F8D62E] border-[#F8D62E]"
                    : s.accent === "green"
                    ? "bg-green-50 border-green-100"
                    : s.accent === "red"
                    ? "bg-[#FA6868]/10 border-[#FA6868]/20"
                    : "bg-white border-[#E5E5E5]"
                }`}
              >
                <p className="text-xs text-[#303030]/70 mb-1">{s.title}</p>
                <p className="text-2xl font-medium text-[#303030]">{s.value}</p>
                {s.caption && <p className="text-xs text-[#303030]/60 mt-1">{s.caption}</p>}
              </div>
            ))
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-4">Последние события</h2>
          {loading && activity.length === 0 ? (
            <p className="text-sm text-[#A1A1A1]">Загрузка...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-[#A1A1A1]">Нет событий</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-[#E5E5E5] last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#A1A1A1]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#303030]">
                      {ACTION_LABELS[a.action] || a.action} ·{" "}
                      <span className="text-[#A1A1A1]">{ENTITY_LABELS[a.entity] || a.entity}</span>
                    </p>
                    <p className="text-[11px] text-[#A1A1A1] mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-4">Быстрые действия</h2>
          <div className="flex flex-col gap-2">
            {quickActions.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#E5E5E5] text-sm text-[#303030] hover:bg-gray-50 hover:border-[#303030] transition-colors"
              >
                <span>{q.label}</span>
                <svg className="w-4 h-4 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-[#E5E5E5]">
            <p className="text-xs text-[#A1A1A1]">
              Ваш уровень доступа &mdash; <Badge variant="yellow" className="ml-1">{ROLE_LABELS[role] || role}</Badge>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
