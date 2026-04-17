"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CancelOrderModal } from "@/components/ui/cancel-order-modal";

/* ── types & mock data ────────────────────────────────── */

type OrderStatus = "ASSIGNED" | "ORDERED" | "BANNED" | "DELAYED";

interface Order {
  id: string;
  addressFrom: string;
  addressTo: string;
  assignedAt: string;
  minutesAgo: number;
  status: OrderStatus;
  userName: string;
}

const MOCK_ORDERS: Order[] = [
  { id: "1", addressFrom: "ул. Тверская, 12", addressTo: "Шереметьево, терминал D", assignedAt: "16.04.2026 14:32", minutesAgo: 5, status: "ASSIGNED", userName: "Иванов И.И." },
  { id: "2", addressFrom: "Проспект Мира, 45", addressTo: "Кутузовский пр., 88", assignedAt: "16.04.2026 14:15", minutesAgo: 22, status: "ASSIGNED", userName: "Петров П.С." },
  { id: "3", addressFrom: "ул. Арбат, 1", addressTo: "Домодедово, терминал 1", assignedAt: "16.04.2026 13:50", minutesAgo: 47, status: "DELAYED", userName: "Сидорова М.А." },
  { id: "4", addressFrom: "Ленинградский пр., 29", addressTo: "ул. Профсоюзная, 100", assignedAt: "16.04.2026 13:30", minutesAgo: 67, status: "ORDERED", userName: "Козлов А.Д." },
  { id: "5", addressFrom: "Садовое кольцо, 22", addressTo: "ВДНХ, павильон 75", assignedAt: "16.04.2026 12:45", minutesAgo: 112, status: "BANNED", userName: "Смирнов Д.О." },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  ASSIGNED: { label: "Назначен", variant: "yellow" },
  ORDERED: { label: "Заказан", variant: "green" },
  BANNED: { label: "Бан", variant: "red" },
  DELAYED: { label: "Отложен", variant: "gray" },
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [fiveMinCount, setFiveMinCount] = useState(2);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  const confirmCancel = () => {
    if (!cancelTarget) return;
    setOrders((prev) => prev.filter((o) => o.id !== cancelTarget.id));
    setCancelTarget(null);
  };

  const handleAction = (orderId: string, action: "ordered" | "banned" | "delayed") => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (action === "ordered") return { ...o, status: "ORDERED" as OrderStatus };
        if (action === "banned") return { ...o, status: "BANNED" as OrderStatus };
        return { ...o, status: "DELAYED" as OrderStatus };
      })
    );
    if (action === "delayed") setFiveMinCount((c) => c + 1);
  };

  const activeOrders = orders.filter((o) => o.status === "ASSIGNED" || o.status === "DELAYED");
  const completedOrders = orders.filter((o) => o.status === "ORDERED" || o.status === "BANNED");

  return (
    <div>
      <CancelOrderModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        balance={500}
        title="Отменить заказ от имени пользователя?"
        description={`Заказ ${cancelTarget?.userName ?? ""} будет отменён. Со счёта пользователя спишется 15 баллов.`}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Заказы «По делам, без 9%»</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#A1A1A1]">Отложено (5 мин):</span>
          <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
            fiveMinCount > 3 ? "bg-[#FA6868]/10 text-[#FA6868]" : "bg-gray-100 text-[#303030]"
          }`}>
            {fiveMinCount}
          </span>
        </div>
      </div>

      {/* Active orders */}
      <h2 className="text-sm font-medium text-[#A1A1A1] uppercase tracking-wider mb-3">Активные заказы</h2>
      <div className="space-y-3 mb-8">
        {activeOrders.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E5E5E5] px-4 py-12 text-center text-sm text-[#A1A1A1]">
            Нет активных заказов
          </div>
        )}
        {activeOrders.map((order) => (
          <div
            key={order.id}
            className={`bg-white rounded-xl border border-[#E5E5E5] p-4 ${
              order.minutesAgo > 30 ? "border-l-4 border-l-[#FA6868]" : ""
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-[#303030]">{order.userName}</span>
                  <Badge variant={STATUS_CONFIG[order.status].variant}>
                    {STATUS_CONFIG[order.status].label}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 mb-1">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                  <span className="text-sm text-[#303030]">{order.addressFrom}</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#FA6868] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                  <span className="text-sm text-[#303030]">{order.addressTo}</span>
                </div>
                <p className="text-xs text-[#A1A1A1] mt-2">
                  Назначен: {order.assignedAt} ({order.minutesAgo} мин. назад)
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(order.id, "ordered")}
                  className="h-[38px] px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Заказан
                </button>
                <button
                  onClick={() => handleAction(order.id, "banned")}
                  className="h-[38px] px-4 rounded-lg text-sm font-medium bg-[#FA6868] text-white hover:bg-red-600 transition-colors"
                >
                  Упс, бан
                </button>
                <button
                  onClick={() => handleAction(order.id, "delayed")}
                  className="h-[38px] px-4 rounded-lg text-sm font-medium bg-[#F8D62E] text-[#303030] hover:bg-[#e6c427] transition-colors"
                >
                  5 мин
                </button>
                <button
                  onClick={() => setCancelTarget(order)}
                  className="h-[38px] px-4 rounded-lg text-sm font-medium bg-gray-100 text-[#303030] hover:bg-gray-200 transition-colors"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completed orders */}
      <h2 className="text-sm font-medium text-[#A1A1A1] uppercase tracking-wider mb-3">Обработанные</h2>
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Пользователь</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Маршрут</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.map((order) => {
              const sc = STATUS_CONFIG[order.status];
              return (
                <tr key={order.id} className="border-b border-[#E5E5E5] last:border-0">
                  <td className="px-4 py-3 text-[#303030]">{order.userName}</td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{order.addressFrom} &rarr; {order.addressTo}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                </tr>
              );
            })}
            {completedOrders.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Нет обработанных заказов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards for completed */}
      <div className="md:hidden space-y-3">
        {completedOrders.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Нет обработанных заказов
          </div>
        ) : (
          completedOrders.map((order) => {
            const sc = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-[#303030]">{order.userName}</p>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                <p className="text-xs text-[#A1A1A1]">
                  {order.addressFrom} &rarr; {order.addressTo}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
