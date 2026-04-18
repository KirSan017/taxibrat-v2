"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BANNED: { label: "Бан", variant: "red" },
  CANCELLED: { label: "Отменён", variant: "gray" },
  EXPIRED: { label: "Истёк", variant: "gray" },
};

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<FeatureStatus | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadOrders = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<OrdersResponse>("/admin/orders/no9?page=1&limit=50", { token })
      .then((res) => setOrders(res.data || []))
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
  }, [user]);

  const handleAction = async (orderId: string, endpoint: "ordered" | "banned" | "five-min") => {
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
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <span className="text-xs text-[#A1A1A1]">
                        {new Date(o.createdAt).toLocaleString("ru-RU")}
                      </span>
                      <span className="text-xs text-[#A1A1A1]">· {minsAgo} мин. назад</span>
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
                      Бан
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(o.id, "five-min")}>
                      +5 мин
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
