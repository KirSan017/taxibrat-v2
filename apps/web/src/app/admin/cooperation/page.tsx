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
  ADMIN_PILL_ACTIVE,
  ADMIN_PILL_BASE,
  ADMIN_PILL_INACTIVE,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface CooperationRequest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface CooperationListResponse {
  data: CooperationRequest[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

/* ── page ─────────────────────────────────────────────── */

const LIMIT = 20;

export default function AdminCooperationPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CooperationRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (filter === "UNREAD") params.set("isRead", "false");
    if (filter === "READ") params.set("isRead", "true");
    api<CooperationListResponse>(`/admin/cooperation?${params.toString()}`, { token })
      .then((res) => {
        setRequests(res.data || []);
        setTotal(res.total || 0);
        setUnread(res.unread || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter, page]);

  const markRead = async (id: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/cooperation/${id}/read`, { method: "POST", token });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отметить");
    }
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Входящие</p>
        <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3 flex-wrap`}>
          Заявки на сотрудничество
          <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
            {total}
          </span>
          {unread > 0 && (
            <span className="inline-flex items-center px-2.5 h-[26px] rounded-full text-xs font-semibold bg-[#FA6868] text-white">
              {unread} новых
            </span>
          )}
        </h1>
        <p className={ADMIN_PAGE_SUBTITLE}>Запросы от потенциальных партнёров и клиентов</p>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["ALL", "UNREAD", "READ"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`${ADMIN_PILL_BASE} ${
              filter === f ? ADMIN_PILL_ACTIVE : ADMIN_PILL_INACTIVE
            }`}
          >
            {f === "ALL" ? "Все" : f === "UNREAD" ? "Непрочитанные" : "Прочитанные"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
      ) : requests.length === 0 ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
          Заявок нет
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 border transition-all ${
                r.isRead ? "border-[#EFEFEF]" : "border-[#F8D62E] bg-[#FFFBE6]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-[#1F1F1F]">{r.name}</h3>
                  <p className="text-xs text-[#A1A1A1] mt-1">
                    {r.phone ? `Тел.: ${r.phone}` : ""}
                    {r.phone && r.email ? " · " : ""}
                    {r.email ? `Email: ${r.email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.isRead && <span className={statusBadgeClass("yellow")}>Новая</span>}
                  <span className="text-[11px] text-[#A1A1A1]">
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#5E5E5E] whitespace-pre-line">{r.message}</p>
              {!r.isRead && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => markRead(r.id)}
                    className={`${ADMIN_OUTLINE_BTN} h-[36px] px-4 text-xs`}
                  >
                    Отметить прочитанной
                  </button>
                </div>
              )}
            </div>
          ))}
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
