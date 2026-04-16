"use client";

import { useState } from "react";

/* ── mock data ─────────────────────────────────────────── */

const MOCK_BALANCE = 156;

const MOCK_TRANSACTIONS = [
  { id: 1, date: "16.04.2025", description: "Регистрация на платформе", amount: 100, type: "credit" as const },
  { id: 2, date: "14.04.2025", description: "Проверка таксопарка «Альфа»", amount: 50, type: "credit" as const },
  { id: 3, date: "12.04.2025", description: "Заказ «По делам» — оплата", amount: -30, type: "debit" as const },
  { id: 4, date: "10.04.2025", description: "Приглашение друга: Сергей К.", amount: 300, type: "credit" as const },
  { id: 5, date: "08.04.2025", description: "Проверка по базе таксопарков", amount: -50, type: "debit" as const },
  { id: 6, date: "05.04.2025", description: "Заполнение профиля", amount: 100, type: "credit" as const },
  { id: 7, date: "03.04.2025", description: "Приглашение друга: Алексей М.", amount: 300, type: "credit" as const },
  { id: 8, date: "01.04.2025", description: "Заказ «По делам» — оплата", amount: -30, type: "debit" as const },
  { id: 9, date: "28.03.2025", description: "Проверка таксопарка «Драйв Парк»", amount: 50, type: "credit" as const },
  { id: 10, date: "25.03.2025", description: "Бонус за активность", amount: 200, type: "credit" as const },
];

const ITEMS_PER_PAGE = 7;

/* ── component ─────────────────────────────────────────── */

export default function PointsPage() {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(MOCK_TRANSACTIONS.length / ITEMS_PER_PAGE);
  const paged = MOCK_TRANSACTIONS.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="max-w-[700px]">
      <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mb-8">
        Баллы дружбы
      </h1>

      {/* Balance card */}
      <div className="bg-[#F8D62E] rounded-2xl p-6 md:p-8 mb-8">
        <p className="text-sm text-[#303030]/60 mb-1">Текущий баланс</p>
        <p className="text-4xl md:text-5xl font-medium text-[#303030]">
          {MOCK_BALANCE}
          <span className="text-lg md:text-xl font-normal text-[#303030]/60 ml-2">баллов</span>
        </p>
      </div>

      {/* How to earn block */}
      <div className="border border-[#E5E5E5] rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-medium text-[#303030] mb-3">Как заработать баллы?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { action: "Регистрация", points: "+100" },
            { action: "Заполнение профиля", points: "+100" },
            { action: "Приглашение друга", points: "+300" },
            { action: "Проверка таксопарка", points: "+50" },
            { action: "Аренда через сервис", points: "+500" },
            { action: "Выкуп авто через нас", points: "+1000" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5">
              <span className="text-[#A1A1A1]">{item.action}</span>
              <span className="text-green-600 font-medium">{item.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <h2 className="text-lg font-medium text-[#303030] mb-4">История операций</h2>
        <div className="space-y-0 divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden">
          {paged.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between px-4 py-3.5 bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm text-[#303030] truncate">{tx.description}</p>
                <p className="text-[10px] text-[#A1A1A1] mt-0.5">{tx.date}</p>
              </div>
              <span
                className={`text-sm font-medium shrink-0 ml-4 ${
                  tx.type === "credit" ? "text-green-600" : "text-[#FA6868]"
                }`}
              >
                {tx.type === "credit" ? "+" : ""}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? "bg-[#F8D62E] text-[#303030]"
                  : "text-[#A1A1A1] hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
