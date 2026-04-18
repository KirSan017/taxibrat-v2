"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

/* ── roles ────────────────────────────────────────────── */

type AdminRole = "MANAGER" | "SUPER_MANAGER" | "ADMIN";

/* ── nav items with role-based access ─────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  roles: AdminRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/parks", label: "Проверки таксопарков", icon: CheckIcon, roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/users", label: "Пользователи", icon: UsersIcon, roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/tickets", label: "Чат (тикеты)", icon: ChatIcon, roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/orders", label: "По делам, без 9%", icon: OrdersIcon, roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/buyout", label: "Выкуп авто", icon: CarIcon, roles: ["MANAGER", "SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/managers", label: "Менеджеры", icon: ManagerIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/stats", label: "Статистика", icon: StatsIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/audit", label: "Архив изменений", icon: AuditIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/archive", label: "Архив задач", icon: AuditIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/news", label: "Новости", icon: NewsIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/cooperation", label: "Сотрудничество", icon: HandshakeIcon, roles: ["SUPER_MANAGER", "ADMIN"] },
  { href: "/admin/super-managers", label: "Супер-менеджеры", icon: ShieldIcon, roles: ["ADMIN"] },
  { href: "/admin/parks-list", label: "Список таксопарков", icon: ListIcon, roles: ["ADMIN"] },
  { href: "/admin/rating", label: "Рейтинг", icon: StatsIcon, roles: ["ADMIN"] },
  { href: "/admin/settings", label: "Настройки сервиса", icon: SettingsIcon, roles: ["ADMIN"] },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

/* ── breadcrumb map ───────────────────────────────────── */

function getBreadcrumb(pathname: string): string {
  if (pathname === "/admin") return "Главная";
  const item = NAV_ITEMS.find((i) => pathname.startsWith(i.href));
  return item?.label ?? "Админ-панель";
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || "?";
  return "?";
}

/* ── layout ───────────────────────────────────────────── */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guard: need to be logged in and have non-USER role
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role === "USER") {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-sm text-[#A1A1A1]">Загрузка...</div>
      </div>
    );
  }

  if (user.role === "USER") {
    return null;
  }

  const role = user.role as AdminRole;
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone;
  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* ══════ TOP HEADER ══════ */}
      <header className="w-full border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
          {/* Left: logo + admin badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F8D62E] rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#303030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-lg font-medium text-[#303030]">Таксибрат</span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#F8D62E] text-[#303030]">
              {ROLE_LABELS[role]}
            </span>
          </div>

          {/* Center: breadcrumbs (desktop) */}
          <div className="hidden md:flex items-center gap-2 text-xs text-[#A1A1A1]">
            <Link href="/admin" className="hover:text-[#303030] transition-colors">Админ-панель</Link>
            <span>/</span>
            <span className="text-[#303030]">{getBreadcrumb(pathname)}</span>
          </div>

          {/* Right: notifications + avatar */}
          <div className="flex items-center gap-3">
            <button className="relative p-2">
              <BellIcon className="w-5 h-5 text-[#303030]" />
            </button>
            <div className="w-8 h-8 bg-[#E5E5E5] rounded-full overflow-hidden flex items-center justify-center">
              {user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-[#A1A1A1]">{initials}</span>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 -mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-[#303030]" />
              ) : (
                <Menu className="w-6 h-6 text-[#303030]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ══════ BODY ══════ */}
      <div className="flex-1 flex">
        <div className="max-w-[1600px] mx-auto w-full flex">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-[#E5E5E5] bg-white px-4 py-6">
            {/* Admin info */}
            <div className="mb-6 px-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E5E5E5] rounded-full flex items-center justify-center overflow-hidden">
                  {user.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-[#A1A1A1]">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#303030] truncate">{displayName}</p>
                  <p className="text-xs text-[#A1A1A1]">{ROLE_LABELS[role]}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {filteredNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-[#F8D62E]/15 text-[#303030] font-medium"
                        : "text-[#A1A1A1] hover:text-[#303030] hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Back to site */}
            <div className="mt-auto pt-6">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Вернуться на сайт
              </Link>
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
              <aside className="relative w-[280px] bg-white border-r border-[#E5E5E5] flex flex-col px-4 py-6 overflow-y-auto">
                <div className="mb-6 px-3">
                  <p className="text-sm font-medium text-[#303030]">{displayName}</p>
                  <p className="text-xs text-[#A1A1A1]">{ROLE_LABELS[role]}</p>
                </div>
                <nav className="flex flex-col gap-0.5">
                  {filteredNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-[#F8D62E]/15 text-[#303030] font-medium"
                            : "text-[#A1A1A1] hover:text-[#303030] hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-auto pt-6">
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Вернуться на сайт
                  </Link>
                </div>
              </aside>
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Icon components ───────────────────────────────────── */

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function OrdersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 7h8M8 12h8M8 17h4" />
    </svg>
  );
}

function CarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h8l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function ManagerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StatsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function AuditIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );
}

function NewsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2z" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="12" x2="13" y2="12" />
      <line x1="7" y1="16" x2="11" y2="16" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ListIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function HandshakeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 17l-5-5 2-2 3 3 7-7 2 2-9 9z" />
      <path d="M3 3h18v18H3z" opacity="0.2" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );
}
