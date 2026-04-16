"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/* ── mock data ──────────────────────────────────────────── */

interface NewsItem {
  id: number;
  title: string;
  date: string;
  preview: string;
  content: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: 1,
    title: "Запуск сервиса «По делам, без 9%»",
    date: "15.04.2026",
    preview: "Мы рады представить новый сервис для водителей такси — заказы без комиссии агрегатора.",
    content: "Мы рады представить новый сервис для водителей такси — заказы без комиссии агрегатора. Теперь каждый зарегистрированный пользователь может получить заказ напрямую, оплатив всего 50 баллов дружбы. Это позволяет экономить до 9% с каждой поездки. Сервис работает по всей Москве и Московской области. Для использования достаточно зарегистрироваться на платформе и заполнить профиль водителя.",
  },
  {
    id: 2,
    title: "Обновление рейтинга таксопарков",
    date: "10.04.2026",
    preview: "Добавлены 12 новых параметров оценки таксопарков для более точного сравнения.",
    content: "Мы расширили систему оценки таксопарков, добавив 12 новых параметров. Теперь в рейтинге учитываются: наличие подменного автомобиля, условия по каско и ОСАГО, доступность детских кресел, наличие газового оборудования и многое другое. Все данные собираются на основе отзывов реальных водителей и проверок нашей команды.",
  },
  {
    id: 3,
    title: "Программа «Баллы дружбы» — как это работает",
    date: "05.04.2026",
    preview: "Подробный гайд по программе лояльности: как копить и тратить баллы дружбы.",
    content: "Баллы дружбы — это внутренняя валюта платформы ТаксиБрат. Вы получаете баллы за: регистрацию (100 баллов), приглашение друга (50 баллов), проверку таксопарка (30 баллов), написание отзыва (20 баллов). Баллы можно потратить на: заказ «По делам» (50 баллов), детальную проверку парка (30 баллов), приоритетное размещение объявления (100 баллов).",
  },
  {
    id: 4,
    title: "Выкуп авто — новый раздел",
    date: "01.04.2026",
    preview: "Теперь на платформе можно найти автомобили для выкупа от таксопарков, банков и частных лиц.",
    content: "Мы запустили маркетплейс автомобилей для выкупа. В разделе представлены предложения от таксопарков, банков, юридических и физических лиц. Каждое объявление проходит модерацию. Вы можете забронировать автомобиль онлайн — наш менеджер свяжется с вами для уточнения деталей. Все автомобили подходят для работы в такси.",
  },
  {
    id: 5,
    title: "Партнёрская программа для таксопарков",
    date: "25.03.2026",
    preview: "Приглашаем таксопарки к сотрудничеству — размещайте свои парки в нашем рейтинге.",
    content: "Мы открываем партнёрскую программу для таксопарков Москвы и Московской области. Размещение в рейтинге бесплатно. Рекламные позиции доступны по специальным тарифам. Партнёры получают: выделенную карточку в каталоге, приоритет в поисковой выдаче, доступ к аналитике по просмотрам и заявкам.",
  },
  {
    id: 6,
    title: "Техническое обновление платформы",
    date: "20.03.2026",
    preview: "Ускорили работу сайта, обновили дизайн и добавили новые фильтры в каталог.",
    content: "Провели масштабное техническое обновление платформы. Скорость загрузки страниц увеличилась на 40%. Обновили дизайн каталога таксопарков — теперь информация представлена компактнее и нагляднее. Добавили фильтры по районам Москвы и году выпуска автомобилей. Исправили ряд ошибок, о которых сообщали пользователи.",
  },
  {
    id: 7,
    title: "Итоги первого месяца работы",
    date: "15.03.2026",
    preview: "143 000+ пользователей, 148 проверенных парков и 1 200+ выполненных заказов.",
    content: "Подводим итоги первого месяца работы платформы. Более 143 000 пользователей зарегистрировались на ТаксиБрат. Мы проверили 148 таксопарков в Москве и Московской области. Через сервис «По делам» выполнено более 1 200 заказов. Средняя оценка платформы — 4.7 из 5. Спасибо всем, кто поддерживает проект!",
  },
];

const ITEMS_PER_PAGE = 5;

/* ── component ──────────────────────────────────────────── */

export default function NewsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(MOCK_NEWS.length / ITEMS_PER_PAGE));
  const paginated = MOCK_NEWS.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
            Новости
          </h1>
          <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
            Последние обновления и события платформы ТаксиБрат.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        <div className="max-w-3xl">
          {/* ══════ NEWS LIST ══════ */}
          <div className="space-y-4 mb-8">
            {paginated.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <article
                  key={item.id}
                  className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left p-5 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-[#A1A1A1] mb-1.5">{item.date}</p>
                        <h3 className="text-base font-medium text-[#303030] mb-2">{item.title}</h3>
                        <p className="text-sm text-[#A1A1A1] leading-relaxed">{item.preview}</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-[#A1A1A1] shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 md:px-6 md:pb-6">
                      <div className="border-t border-[#E5E5E5] pt-4">
                        <p className="text-sm text-[#303030] leading-relaxed">{item.content}</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* ══════ PAGINATION ══════ */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 mb-12">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage
                      ? "bg-[#303030] text-white"
                      : "text-[#303030] hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
              >
                &raquo;
              </button>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
