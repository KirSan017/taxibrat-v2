"use client";

import { useEffect, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  statusBadgeClass,
  statusDotClass,
} from "@/components/admin/admin-styles";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  PENDING: { label: "Назначен", variant: "yellow" },
  ORDERED: { label: "Заказан", variant: "green" },
  BANNED: { label: "Упс, бан", variant: "red" },
  CANCEL_REQUESTED: { label: "Запрос отмены", variant: "yellow" },
  CANCELLED: { label: "Отменён", variant: "grey" },
  EXPIRED: { label: "Истёк", variant: "grey" },
};

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

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
    minutes >= 3 ? "text-[#FA6868]" : minutes >= 2 ? "text-[#F59E0B]" : "text-[#1F1F1F]";

  return (
    <span
      className={`font-mono text-sm font-semibold tabular-nums ${color}`}
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

  const activeOrders = orders.filter((o) => o.status === "PENDING" || o.status === "CANCEL_REQUESTED");
  const completedOrders = orders.filter(
    (o) => o.status !== "PENDING" && o.status !== "CANCEL_REQUESTED",
  );

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">
            Без 9% комиссии
          </p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Заказы «По делам»
            {isAdmin && status && !status.enabled && (
              <span className={statusBadgeClass("red")}>Сервис выключен</span>
            )}
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Активные заказы и история выполнения
          </p>
        </div>
      </div>

      {/* ── Status card (admin) ── */}
      {isAdmin && status && (
        <div className={`${ADMIN_CARD} p-5 mb-6 flex flex-wrap gap-6`}>
          <div>
            <p className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
              Статус функции
            </p>
            <p
              className={`text-sm font-semibold mt-1 ${
                status.enabled ? "text-[#3BB560]" : "text-[#FA6868]"
              }`}
            >
              <span className={statusDotClass(status.enabled ? "green" : "red")} />{" "}
              {status.enabled ? "Включена" : "Выключена"}
            </p>
          </div>
          {status.activeManagers !== undefined && (
            <div>
              <p className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                Активных менеджеров
              </p>
              <p className="text-sm font-semibold text-[#1F1F1F] mt-1">{status.activeManagers}</p>
            </div>
          )}
          {status.activeOrders !== undefined && (
            <div>
              <p className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                Активных заказов
              </p>
              <p className="text-sm font-semibold text-[#1F1F1F] mt-1">{status.activeOrders}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
      ) : orders.length === 0 ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
          Нет назначенных заказов
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active section */}
          {activeOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#1F1F1F] mb-3 flex items-center gap-2">
                Активные
                <span className="inline-flex items-center justify-center min-w-[24px] h-[20px] px-1.5 rounded-full text-[10px] font-semibold bg-[#F2F2F2] text-[#A1A1A1]">
                  {activeOrders.length}
                </span>
              </h2>
              <div className="space-y-3">
                {activeOrders.map((o) => {
                  const sc = STATUS_CONFIG[o.status] || { label: o.status, variant: "grey" as const };
                  const minsAgo = minutesSince(o.createdAt);
                  const canAct = o.status === "PENDING";
                  return (
                    <div key={o.id} className={`${ADMIN_CARD} p-4 md:p-5`}>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                        <span className="text-xs text-[#A1A1A1]">
                          {new Date(o.createdAt).toLocaleString("ru-RU")} · {minsAgo} мин. назад
                        </span>
                        {canAct && o.assignedAt && (
                          <span className="inline-flex items-center gap-1.5 ml-auto px-2.5 h-[28px] rounded-full bg-[#FAFAFA] border border-[#EFEFEF]">
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

                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-[#3BB560] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="10" r="4" />
                          </svg>
                          <span className="text-sm text-[#1F1F1F]">{o.pointFrom}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-[#FA6868] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="10" r="4" />
                          </svg>
                          <span className="text-sm text-[#1F1F1F]">{o.pointTo}</span>
                        </div>
                      </div>

                      {canAct && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(o.id, "ordered")}
                            className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                          >
                            Заказан
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(o.id, "banned")}
                            className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                          >
                            Упс, бан
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(o.id, "five-min")}
                            className={`${ADMIN_OUTLINE_BTN} h-[40px] px-4`}
                          >
                            +5 мин
                          </button>
                        </div>
                      )}

                      {o.status === "CANCEL_REQUESTED" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(o.id, "confirm-cancel")}
                            className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#FA6868] text-white text-sm font-medium hover:bg-[#E85555] transition-colors"
                          >
                            Подтвердить отмену
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed section */}
          {completedOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#1F1F1F] mb-3 flex items-center gap-2">
                Завершённые
                <span className="inline-flex items-center justify-center min-w-[24px] h-[20px] px-1.5 rounded-full text-[10px] font-semibold bg-[#F2F2F2] text-[#A1A1A1]">
                  {completedOrders.length}
                </span>
              </h2>
              <div className="space-y-2">
                {completedOrders.map((o) => {
                  const sc = STATUS_CONFIG[o.status] || { label: o.status, variant: "grey" as const };
                  return (
                    <div key={o.id} className={`${ADMIN_CARD} p-4`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                        <span className="text-xs text-[#A1A1A1]">
                          {new Date(o.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-[#A1A1A1]">
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3BB560] mt-2 shrink-0" />
                          <span className="truncate">{o.pointFrom}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FA6868] mt-2 shrink-0" />
                          <span className="truncate">{o.pointTo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
