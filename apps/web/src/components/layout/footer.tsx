import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
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
