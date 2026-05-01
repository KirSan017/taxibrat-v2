"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <footer className="w-full bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pb-[35px]">
          <div className="flex flex-col gap-4 text-[13px] leading-[17px] md:flex-row md:items-center md:justify-between">
            <nav className="flex flex-col gap-3 md:flex-row md:items-center md:gap-[39px]">
              <span className="text-[#A2A2A2]">© 2025 Таксибрат - Сервис для водителей такси №1</span>
              <Link href="/support" className="text-[#303030] transition-colors hover:text-[#A2A2A2]">
                Техподдержка
              </Link>
              <Link href="/privacy" className="text-[#303030] transition-colors hover:text-[#A2A2A2]">
                Политика конфиденциальности
              </Link>
              <Link href="/cooperation" className="text-[#303030] transition-colors hover:text-[#A2A2A2]">
                Сотрудничество
              </Link>
            </nav>
            <span className="text-[#303030] md:text-right">Разработка danilsmg.ru</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-[#E5E5E5] bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <Logo size="md" />
            <p className="mt-3 text-sm text-[#A1A1A1] max-w-sm">
              Честный рейтинг таксопарков Москвы и МО
            </p>
          </div>

          <nav className="flex flex-col md:flex-row gap-6 md:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#303030]">Сервис</span>
              <Link href="/parks" className="text-sm text-[#A1A1A1] hover:text-[#303030]">Таксопарки</Link>
              <Link href="/buyout" className="text-sm text-[#A1A1A1] hover:text-[#303030]">Выкуп авто</Link>
              <Link href="/no9" className="text-sm text-[#A1A1A1] hover:text-[#303030]">По делам, без 9%</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#303030]">Компания</span>
              <Link href="/cooperation" className="text-sm text-[#A1A1A1] hover:text-[#303030]">Сотрудничество</Link>
              <Link href="/privacy" className="text-sm text-[#A1A1A1] hover:text-[#303030]">Политика конфиденциальности</Link>
              <Link href="/terms" className="text-sm text-[#A1A1A1] hover:text-[#303030]">Оферта</Link>
            </div>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5] text-center">
          <p className="text-xs text-[#A1A1A1]">&copy; 2026 Таксибрат. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
