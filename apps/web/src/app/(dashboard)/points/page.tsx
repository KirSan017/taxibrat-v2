"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────── */

interface BalanceResponse {
  balance: number;
  displayBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface HistoryResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION: "Регистрация",
  PARK_CHECK: "Проверка/Добавление таксопарка",
  TAXI_CONNECT: "Подключение к такси",
  RENTAL_CONFIRMED: "Подтверждение аренды",
  BUYOUT: "Выкуп авто",
  REFERRAL: "Реферальный бонус",
  ORDER_NO9: "Заказ «По делам»",
  ORDER_CANCEL: "Отмена заказа",
  BASE_CHECK: "Проверка по базе",
  MANUAL_ADMIN: "Начисление администратора",
  IDEA: "Идея",
};

const PAGE_LIMIT = 20;

/* ── component ─────────────────────────────────────── */

export default function PointsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    Promise.all([
      api<BalanceResponse>("/points/balance", { token }),
      api<HistoryResponse>(`/points/history?page=${page}&limit=${PAGE_LIMIT}`, { token }),
    ])
      .then(([balanceRes, historyRes]) => {
        setBalance(balanceRes);
        setTransactions(historyRes.data || []);
        setTotal(historyRes.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [user, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="max-w-[700px]">
      <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mb-8">
        Баллы дружбы
      </h1>

      {/* Balance card */}
      <div className="bg-[#F8D62E] rounded-2xl p-6 md:p-8 mb-8">
        <p className="text-sm text-[#303030]/60 mb-1">Текущий баланс</p>
        <p className="text-4xl md:text-5xl font-medium text-[#303030]">
          {loading ? "..." : balance?.displayBalance ?? 0}
          <span className="text-lg md:text-xl font-normal text-[#303030]/60 ml-2">баллов</span>
        </p>
      </div>

      {/* How to earn block */}
      <div className="border border-[#E5E5E5] rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-medium text-[#303030] mb-3">Как заработать баллы?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { action: "Регистрация + профиль", points: "+100" },
            { action: "Приглашение друга", points: "+200" },
            { action: "Другу за регистрацию", points: "+100" },
            { action: "Добавление таксопарка", points: "+200" },
            { action: "Проверка таксопарка", points: "+150" },
            { action: "Подключение к такси", points: "+150" },
            { action: "Взять в аренду", points: "+300" },
            { action: "Выкуп авто через нас", points: "+1000" },
            { action: "Идея", points: "+50" },
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
        {loading ? (
          <p className="text-sm text-[#A1A1A1] text-center py-8">Загрузка...</p>
        ) : error ? (
          <p className="text-sm text-[#FA6868] text-center py-8">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-[#A1A1A1] text-center py-8">Операций пока нет</p>
        ) : (
          <div className="space-y-0 divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3.5 bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#303030] truncate">
                    {tx.description || TYPE_LABELS[tx.type] || tx.type}
                  </p>
                  <p className="text-[10px] text-[#A1A1A1] mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium shrink-0 ml-4 ${
                    tx.amount > 0 ? "text-green-600" : "text-[#FA6868]"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
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
