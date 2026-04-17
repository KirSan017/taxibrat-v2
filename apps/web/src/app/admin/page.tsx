"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* ── role (mock) ─────────────────────────────────────── */

type AdminRole = "MANAGER" | "SUPER_MANAGER" | "ADMIN";
const MOCK_ROLE: AdminRole = "ADMIN";
const MOCK_NAME = "Алексей Петров";

const ROLE_LABELS: Record<AdminRole, string> = {
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

/* ── stats per role ──────────────────────────────────── */

interface StatCard {
  title: string;
  value: string;
  caption?: string;
  accent?: "yellow" | "green" | "red";
}

const STATS_BY_ROLE: Record<AdminRole, StatCard[]> = {
  MANAGER: [
    { title: "Активных тикетов", value: "12", caption: "в вашей очереди" },
    { title: "Проверок парков", value: "5", caption: "на модерации" },
    { title: "Заказов «По делам»", value: "8", caption: "активных", accent: "yellow" },
    { title: "Обработано за день", value: "34", accent: "green" },
  ],
  SUPER_MANAGER: [
    { title: "Менеджеров в работе", value: "9", caption: "из 12" },
    { title: "Тикетов в очереди", value: "47" },
    { title: "Авто на модерации", value: "6", accent: "yellow" },
    { title: "Жалоб за сутки", value: "2", accent: "red" },
  ],
  ADMIN: [
    { title: "Пользователей", value: "143 125", caption: "+45 за сутки", accent: "green" },
    { title: "Таксопарков", value: "148", caption: "3 на модерации" },
    { title: "Активных менеджеров", value: "12", caption: "в двух ролях" },
    { title: "Тикетов открыто", value: "47", accent: "yellow" },
  ],
};

/* ── activity feed ───────────────────────────────────── */

interface ActivityItem {
  id: string;
  time: string;
  text: string;
  accent: "gray" | "yellow" | "green" | "red";
}

const ACTIVITY: ActivityItem[] = [
  { id: "a1", time: "2 мин. назад", text: "Новый тикет #1245 — «Проверка парка Альфа»", accent: "yellow" },
  { id: "a2", time: "8 мин. назад", text: "Пользователь завершил регистрацию: Сидорова М.А.", accent: "green" },
  { id: "a3", time: "14 мин. назад", text: "Таксопарк «Драйв Парк» — новая проверка", accent: "gray" },
  { id: "a4", time: "25 мин. назад", text: "Жалоба на водителя ID 1488", accent: "red" },
  { id: "a5", time: "1 ч. назад", text: "Объявление выкупа одобрено: Kia Rio 2022", accent: "green" },
];

/* ── quick actions ───────────────────────────────────── */

interface QuickAction {
  label: string;
  href: string;
  roles: AdminRole[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Проверки парков", href: "/admin/parks", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Открыть тикеты", href: "/admin/tickets", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Заказы «По делам»", href: "/admin/orders", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Пользователи", href: "/admin/users", roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { label: "Статистика", href: "/admin/stats", roles: ["SUPER_MANAGER", "ADMIN"] },
  { label: "Список таксопарков", href: "/admin/parks-list", roles: ["ADMIN"] },
  { label: "Настройки", href: "/admin/settings", roles: ["ADMIN"] },
];

/* ── page ────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const role = MOCK_ROLE;
  const stats = STATS_BY_ROLE[role];
  const quickActions = QUICK_ACTIONS.filter((q) => q.roles.includes(role));

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider">Админ-панель</p>
        <h1 className="text-xl md:text-2xl font-medium text-[#303030] mt-1">
          Добрый день, {MOCK_NAME}
        </h1>
        <p className="text-sm text-[#A1A1A1] mt-1">
          Роль: <span className="text-[#303030] font-medium">{ROLE_LABELS[role]}</span>
        </p>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
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
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-4">Последние события</h2>
          <div className="space-y-3">
            {ACTIVITY.map((a) => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-[#E5E5E5] last:border-0 last:pb-0">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    a.accent === "yellow"
                      ? "bg-[#F8D62E]"
                      : a.accent === "green"
                      ? "bg-green-500"
                      : a.accent === "red"
                      ? "bg-[#FA6868]"
                      : "bg-[#A1A1A1]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#303030]">{a.text}</p>
                  <p className="text-[11px] text-[#A1A1A1] mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
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
              Ваш уровень доступа &mdash; <Badge variant="yellow" className="ml-1">{ROLE_LABELS[role]}</Badge>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
