"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelOrderModal } from "@/components/ui/cancel-order-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────── */

interface Order {
  id: string;
  pointFrom: string;
  pointTo: string;
  status: string;
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "Назначен", variant: "yellow" },
  ORDERED: { label: "Заказан", variant: "green" },
  // BANNED masked as ORDERED for user: backend already маскирует, но defense-in-depth
  BANNED: { label: "Заказан", variant: "green" },
  CANCEL_REQUESTED: { label: "Ожидает отмены", variant: "yellow" },
  CANCELLED: { label: "Отменён", variant: "gray" },
  EXPIRED: { label: "Истёк", variant: "gray" },
};

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

/* ── page ─────────────────────────────────────────── */

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = () => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<OrdersResponse>("/orders/no9?page=1&limit=50", { token })
      .then((res) => setOrders(res.data || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const confirmCancel = async () => {
    if (!cancellingId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/orders/no9/${cancellingId}/cancel`, { method: "POST", token });
      setCancellingId(null);
      setSuccess(true);
      loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
      setCancellingId(null);
    }
  };

  const canCancel = (order: Order) =>
    order.status === "PENDING" && minutesSince(order.createdAt) <= 10;

  return (
    <div className="max-w-[800px]">
      <CancelOrderModal
        open={!!cancellingId}
        onClose={() => setCancellingId(null)}
        onConfirm={confirmCancel}
        balance={(user?.friendshipPoints || 0) + 615}
      />
      <SuccessModal
        open={success}
        onClose={() => setSuccess(false)}
        title="Заказ отменён"
        description="Заказ успешно отменён."
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
          После размещения заказ можно отменить в течение 10 минут.
        </p>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1] mb-4">Вы ещё не оформили ни одного заказа.</p>
          <Link href="/no9">
            <Button size="sm">Создать первый заказ</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const sc = STATUS_CONFIG[o.status] || { label: o.status, variant: "gray" as const };
            const minsAgo = minutesSince(o.createdAt);
            return (
              <div
                key={o.id}
                className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <span className="text-xs text-[#A1A1A1]">
                        {new Date(o.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 mb-1.5">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="4" />
                      </svg>
                      <span className="text-sm text-[#303030]">{o.pointFrom}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[#FA6868] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="4" />
                      </svg>
                      <span className="text-sm text-[#303030]">{o.pointTo}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {canCancel(o) && (
                      <>
                        <button
                          onClick={() => setCancellingId(o.id)}
                          className="text-xs font-medium text-[#FA6868] hover:underline"
                        >
                          Отменить заказ
                        </button>
                        <p className="text-[10px] text-[#A1A1A1] mt-1">
                          До окончания бесплатной отмены: {Math.max(0, 10 - minsAgo)} мин.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
