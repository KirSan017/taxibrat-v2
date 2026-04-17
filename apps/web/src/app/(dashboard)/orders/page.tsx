"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelOrderModal } from "@/components/ui/cancel-order-modal";
import { SuccessModal } from "@/components/ui/success-modal";

/* ── types & mock data ────────────────────────────────── */

type OrderStatus = "PENDING" | "ORDERED" | "BANNED" | "CANCELLED";

interface UserOrder {
  id: string;
  addressFrom: string;
  addressTo: string;
  date: string;
  minutesAgo: number;
  status: OrderStatus;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "Назначен", variant: "yellow" },
  ORDERED: { label: "Заказан", variant: "green" },
  BANNED: { label: "Бан", variant: "red" },
  CANCELLED: { label: "Отменён", variant: "gray" },
};

const INITIAL_ORDERS: UserOrder[] = [
  { id: "1", addressFrom: "ул. Тверская, 12", addressTo: "Шереметьево, терминал D", date: "16.04.2026 14:32", minutesAgo: 3, status: "PENDING" },
  { id: "2", addressFrom: "Проспект Мира, 45", addressTo: "Кутузовский пр., 88", date: "15.04.2026 11:15", minutesAgo: 1300, status: "ORDERED" },
  { id: "3", addressFrom: "ул. Арбат, 1", addressTo: "Домодедово", date: "12.04.2026 09:30", minutesAgo: 5700, status: "ORDERED" },
  { id: "4", addressFrom: "Садовое кольцо, 22", addressTo: "ВДНХ", date: "08.04.2026 17:45", minutesAgo: 11500, status: "BANNED" },
  { id: "5", addressFrom: "Ленинский пр., 10", addressTo: "МКАД, 55 км", date: "02.04.2026 14:00", minutesAgo: 20000, status: "CANCELLED" },
];

/* ── page ─────────────────────────────────────────────── */

export default function OrdersPage() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const balance = 156;

  const confirmCancel = () => {
    if (!cancellingId) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === cancellingId ? { ...o, status: "CANCELLED" as OrderStatus } : o))
    );
    setCancellingId(null);
    setSuccess(true);
  };

  const canCancel = (order: UserOrder) =>
    order.status === "PENDING" && order.minutesAgo <= 10;

  return (
    <div className="max-w-[800px]">
      <CancelOrderModal
        open={!!cancellingId}
        onClose={() => setCancellingId(null)}
        onConfirm={confirmCancel}
        balance={balance}
      />
      <SuccessModal
        open={success}
        onClose={() => setSuccess(false)}
        title="Заказ отменён"
        description="Со счёта списано 15 баллов дружбы."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">Заказы «По делам»</h1>
        <Link href="/no9">
          <Button size="sm">+ Новый заказ</Button>
        </Link>
      </div>

      {/* Info block */}
      <div className="bg-[#F3F1E7] rounded-xl p-5 mb-6">
        <p className="text-sm text-[#303030] leading-relaxed">
          После размещения заказ можно отменить в течение 10 минут. Отмена позже &mdash; списание 15 баллов дружбы.
        </p>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
            <p className="text-sm text-[#A1A1A1] mb-4">Вы ещё не оформили ни одного заказа.</p>
            <Link href="/no9">
              <Button size="sm">Создать первый заказ</Button>
            </Link>
          </div>
        ) : (
          orders.map((o) => {
            const sc = STATUS_CONFIG[o.status];
            return (
              <div
                key={o.id}
                className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <span className="text-xs text-[#A1A1A1]">{o.date}</span>
                    </div>

                    <div className="flex items-start gap-2 mb-1.5">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="4" />
                      </svg>
                      <span className="text-sm text-[#303030]">{o.addressFrom}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[#FA6868] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="4" />
                      </svg>
                      <span className="text-sm text-[#303030]">{o.addressTo}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {canCancel(o) && (
                      <button
                        onClick={() => setCancellingId(o.id)}
                        className="text-xs font-medium text-[#FA6868] hover:underline"
                      >
                        Отменить заказ
                      </button>
                    )}
                    {o.status === "PENDING" && !canCancel(o) && (
                      <span className="text-xs text-[#A1A1A1]">
                        Отмена &mdash; 15 баллов
                      </span>
                    )}
                    {o.status === "PENDING" && canCancel(o) && (
                      <p className="text-[10px] text-[#A1A1A1] mt-1">
                        До бесплатной отмены: {10 - o.minutesAgo} мин.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
