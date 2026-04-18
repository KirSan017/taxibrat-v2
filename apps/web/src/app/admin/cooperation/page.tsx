"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

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
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (filter === "UNREAD") params.set("isRead", "false");
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
      <h1 className="text-xl font-medium text-[#303030] mb-6">
        Заявки на сотрудничество ({total})
        {unread > 0 && (
          <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FA6868] text-white">
            {unread} непрочитанных
          </span>
        )}
      </h1>

      <div className="flex gap-2 mb-6">
        {(["ALL", "UNREAD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs transition-colors ${
              filter === f
                ? "bg-[#303030] text-white"
                : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
            }`}
          >
            {f === "ALL" ? "Все" : "Непрочитанные"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
          Загрузка...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
          Заявок нет
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-xl p-4 ${
                r.isRead ? "border-[#E5E5E5]" : "border-[#F8D62E] bg-[#F8D62E]/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-medium text-[#303030]">{r.name}</h3>
                  <p className="text-xs text-[#A1A1A1] mt-0.5">
                    {r.phone ? `Тел.: ${r.phone}` : ""}
                    {r.phone && r.email ? " · " : ""}
                    {r.email ? `Email: ${r.email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!r.isRead && <Badge variant="yellow">Новая</Badge>}
                  <span className="text-[11px] text-[#A1A1A1]">
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#303030] whitespace-pre-line">{r.message}</p>
              {!r.isRead && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => markRead(r.id)}>
                    Отметить прочитанной
                  </Button>
                </div>
              )}
            </div>
          ))}
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
