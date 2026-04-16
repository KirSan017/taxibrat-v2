"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/* ── mock user ─────────────────────────────────────────── */
const MOCK_USER = {
  name: "Иван Иванов",
  phone: "8 800 000 00 00",
  rank: 145,
  checks: 3,
  points: 156,
  notifications: 2,
};

/* ── nav items ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Личный кабинет", icon: HomeIcon },
  { href: "/dashboard", label: "Проверки таксопарков", icon: CheckIcon, altHref: "/checks" },
  { href: "/dashboard", label: "Выкуп авто", icon: CarIcon, altHref: "/buyout" },
  { href: "/support", label: "Заказы «По делам, без 9%»", icon: OrdersIcon, altHref: "/orders" },
  { href: "/support", label: "Техподдержка", icon: SupportIcon },
  { href: "/profile", label: "Изменить профиль", icon: ProfileIcon },
  { href: "/referrals", label: "Приглашение друзей", icon: ReferralIcon },
  { href: "/points", label: "Мои идеи", icon: IdeaIcon, altHref: "/ideas" },
];

/* ── bottom tab items (mobile) ─────────────────────────── */
const BOTTOM_TABS = [
  { href: "/dashboard", label: "Главная", icon: HomeIcon },
  { href: "/support", label: "Тикеты", icon: SupportIcon },
  { href: "/points", label: "Баллы", icon: PointsIcon },
  { href: "/profile", label: "Профиль", icon: ProfileIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ══════ TOP HEADER ══════ */}
      <header className="w-full border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F8D62E] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#303030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-medium text-[#303030]">Таксибрат</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/" className="text-sm text-[#303030] hover:text-[#A1A1A1] transition-colors">Главная</Link>
            <Link href="/parks" className="text-sm text-[#303030] hover:text-[#A1A1A1] transition-colors">Таксопарки</Link>
            <Link href="#" className="text-sm text-[#303030] hover:text-[#A1A1A1] transition-colors">По делам, без 9%</Link>
            <Link href="#" className="text-sm text-[#303030] hover:text-[#A1A1A1] transition-colors">Выкуп</Link>
            <Link href="#" className="text-sm text-[#303030] hover:text-[#A1A1A1] transition-colors">Проверка по базе таксопарков</Link>
          </nav>

          {/* Right side: stats + avatar */}
          <div className="flex items-center gap-3">
            <Link
              href="/support"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#303030] bg-gray-50 rounded-full px-3 py-1.5"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{MOCK_USER.checks} проверки</span>
            </Link>
            <Link
              href="/points"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#303030] bg-gray-50 rounded-full px-3 py-1.5"
            >
              <HeartIcon className="w-4 h-4 text-[#FA6868]" />
              <span>{MOCK_USER.points}</span>
            </Link>
            <button className="relative p-2">
              <BellIcon className="w-5 h-5 text-[#303030]" />
              {MOCK_USER.notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FA6868] rounded-full" />
              )}
            </button>
            <Link href="/profile" className="w-8 h-8 bg-[#E5E5E5] rounded-full overflow-hidden flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-[#A1A1A1]" />
            </Link>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 -mr-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E5E5] bg-white">
            <nav className="flex flex-col p-4 gap-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-gray-50 text-[#303030] font-medium"
                      : "text-[#A1A1A1] hover:text-[#303030] hover:bg-gray-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ══════ BREADCRUMB ══════ */}
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center gap-2 text-xs text-[#A1A1A1]">
            <Link href="/" className="hover:text-[#303030] transition-colors">Главная</Link>
            <span>/</span>
            <span className="text-[#303030]">Личный кабинет</span>
          </div>
        </div>
      </div>

      {/* ══════ BODY: sidebar + content ══════ */}
      <div className="flex-1 flex">
        <div className="max-w-[1600px] mx-auto w-full flex">
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-[#E5E5E5] px-6 py-8">
            {/* User card */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#E5E5E5] rounded-full flex items-center justify-center">
                  <UserIcon className="w-7 h-7 text-[#A1A1A1]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#303030]">{MOCK_USER.name}</p>
                  <p className="text-xs text-[#A1A1A1]">{MOCK_USER.phone}</p>
                  <p className="text-xs text-[#A1A1A1]">место в рейтинге: {MOCK_USER.rank}</p>
                </div>
              </div>
              {/* Mini stats */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-xs text-[#303030]">
                  <CheckCircleIcon className="w-4 h-4 text-[#A1A1A1]" />
                  <span>{MOCK_USER.checks} проверки</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#303030]">
                  <HeartIcon className="w-4 h-4 text-[#FA6868]" />
                  <span>{MOCK_USER.points}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#303030]">
                  <BellIcon className="w-4 h-4 text-[#A1A1A1]" />
                  <span>{MOCK_USER.notifications}</span>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.altHref && pathname === item.altHref);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-gray-50 text-[#303030] font-medium"
                        : "text-[#A1A1A1] hover:text-[#303030] hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* ══════ BOTTOM TABS — mobile only ══════ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] z-50">
        <div className="flex items-center justify-around h-[60px]">
          {BOTTOM_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 ${
                  isActive ? "text-[#303030]" : "text-[#A1A1A1]"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ══════ FOOTER ══════ */}
      <footer className="hidden lg:block border-t border-[#E5E5E5] mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-[#A1A1A1]">
            &copy; 2025 Таксибрат &mdash; Сервис для водителей такси №1
          </p>
          <div className="flex items-center gap-6">
            <Link href="/support" className="text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors">Техподдержка</Link>
            <Link href="#" className="text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors">Политика конфиденциальности</Link>
            <Link href="#" className="text-xs text-[#A1A1A1] hover:text-[#303030] transition-colors">Сотрудничество</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Icon components ───────────────────────────────────── */

function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
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

function OrdersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 7h8M8 12h8M8 17h4" />
    </svg>
  );
}

function SupportIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ReferralIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function IdeaIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  );
}

function PointsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );
}
