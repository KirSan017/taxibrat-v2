"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Order {
  id: string;
  pointFrom: string;
  pointTo: string;
  status: string;
  creatorId?: string;
  assignedManagerId?: string | null;
  assignedAt?: string | null;
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
}

interface FeatureStatus {
  enabled: boolean;
  activeManagers?: number;
  activeOrders?: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "Назначен", variant: "yellow" },
  ORDERED: { label: "Заказан", variant: "green" },
  BANNED: { label: "Упс, бан", variant: "red" },
  CANCEL_REQUESTED: { label: "Запрос отмены", variant: "yellow" },
  CANCELLED: { label: "Отменён", variant: "gray" },
  EXPIRED: { label: "Истёк", variant: "gray" },
};

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

/**
 * SLA countdown: visual elapsed since order was assigned.
 * Turns orange at 2 min, red at 3+ min.
 */
function ElapsedTime({ assignedAt }: { assignedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Date.now() - new Date(assignedAt).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [assignedAt]);

  const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const color =
    minutes >= 3
      ? "text-[#FA6868]"
      : minutes >= 2
        ? "text-orange-500"
        : "text-[#303030]";

  return (
    <span
      className={`font-mono text-sm font-medium tabular-nums ${color}`}
      title="Время с момента назначения"
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<FeatureStatus | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const isAdmin = user?.role === "ADMIN";

  const loadOrders = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<OrdersResponse>(`/admin/orders/no9?page=${page}&limit=${LIMIT}`, { token })
      .then((res) => {
        setOrders(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));

    if (isAdmin) {
      api<FeatureStatus>("/admin/orders/no9/status", { token })
        .then(setStatus)
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!user) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const handleAction = async (
    orderId: string,
    endpoint: "ordered" | "banned" | "five-min" | "confirm-cancel",
  ) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/orders/no9/${orderId}/${endpoint}`, { method: "POST", token });
      loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить действие");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Заказы «По делам, без 9%»</h1>

      {isAdmin && status && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 mb-6 flex gap-6">
          <div>
            <p className="text-xs text-[#A1A1A1]">Статус функции</p>
            <p className={`text-sm font-medium ${status.enabled ? "text-green-600" : "text-[#FA6868]"}`}>
              {status.enabled ? "Включена" : "Выключена"}
            </p>
          </div>
          {status.activeManagers !== undefined && (
            <div>
              <p className="text-xs text-[#A1A1A1]">Активных менеджеров</p>
              <p className="text-sm font-medium text-[#303030]">{status.activeManagers}</p>
            </div>
          )}
          {status.activeOrders !== undefined && (
            <div>
              <p className="text-xs text-[#A1A1A1]">Активных заказов</p>
              <p className="text-sm font-medium text-[#303030]">{status.activeOrders}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1]">Нет назначенных заказов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const sc = STATUS_CONFIG[o.status] || { label: o.status, variant: "gray" as const };
            const minsAgo = minutesSince(o.createdAt);
            const canAct = o.status === "PENDING";
            return (
              <div key={o.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <span className="text-xs text-[#A1A1A1]">
                        {new Date(o.createdAt).toLocaleString("ru-RU")}
                      </span>
                      <span className="text-xs text-[#A1A1A1]">· {minsAgo} мин. назад</span>
                      {canAct && o.assignedAt && (
                        <span className="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-md bg-gray-50 border border-[#E5E5E5]">
                          <svg
                            className="w-3.5 h-3.5 text-[#A1A1A1]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <ElapsedTime assignedAt={o.assignedAt} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 mb-1">
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
                </div>

                {canAct && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(o.id, "ordered")}>
                      Заказано
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#FA6868] text-[#FA6868]"
                      onClick={() => handleAction(o.id, "banned")}
                    >
                      Упс, бан
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(o.id, "five-min")}>
                      +5 мин
                    </Button>
                  </div>
                )}

                {o.status === "CANCEL_REQUESTED" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-[#FA6868] hover:bg-[#E85858] text-white"
                      onClick={() => handleAction(o.id, "confirm-cancel")}
                    >
                      Подтвердить отмену
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
