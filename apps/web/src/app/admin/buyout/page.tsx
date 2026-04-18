"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Buyout {
  id: string;
  title?: string | null;
  price?: number | null;
  status: string;
  ownerType?: string | null;
  year?: number | null;
  brandName?: string | null;
  modelName?: string | null;
  createdAt: string;
}

interface BuyoutResponse {
  data: Buyout[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
  PENDING_REVIEW: { label: "На проверке", variant: "yellow" },
  ACTIVE: { label: "Активно", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

const OWNER_LABELS: Record<string, string> = {
  INDIVIDUAL: "Физ лицо",
  LEGAL_ENTITY: "ЮР лицо",
  TAXI_PARK: "Таксопарк",
  BANK: "Банк",
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminBuyoutPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Buyout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const canModerate = user?.role === "ADMIN" || user?.role === "SUPER_MANAGER";

  const loadListings = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    api<BuyoutResponse>(`/admin/buyout?${params.toString()}`, { token })
      .then((res) => {
        setListings(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${id}/approve`, { method: "POST", token, body: {} });
      setSuccessMsg("Объявление одобрено");
      loadListings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить");
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${rejectTarget}/reject`, {
        method: "POST",
        token,
        body: { reason },
      });
      setSuccessMsg("Объявление отклонено");
      setRejectTarget(null);
      loadListings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить");
    }
  };

  const handleArchive = async (id: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${id}/archive`, { method: "POST", token });
      setSuccessMsg("Объявление в архиве");
      loadListings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось заархивировать");
    }
  };

  const handleRestore = async (id: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${id}/restore`, { method: "POST", token });
      setSuccessMsg("Объявление восстановлено");
      loadListings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось восстановить");
    }
  };

  const filtered = listings.filter((l) => {
    if (search) {
      const text = `${l.title || ""} ${l.brandName || ""} ${l.modelName || ""}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title="Отклонить объявление"
        description="Укажите причину отклонения."
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Выкуп авто</h1>
        <Link href="/admin/buyout/add">
          <Button size="sm">+ Новое объявление</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-[300px]">
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING_REVIEW", "ACTIVE", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1]">Объявлений нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const sc = STATUS_CONFIG[l.status] || { label: l.status, variant: "gray" as const };
            const title = l.title || `${l.brandName || ""} ${l.modelName || ""}, ${l.year || ""}`.trim() || "Без названия";
            return (
              <div key={l.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/admin/buyout/${l.id}`} className="text-sm font-medium text-[#303030] hover:underline">
                        {title}
                      </Link>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-[#A1A1A1]">
                      {l.price != null ? `${l.price.toLocaleString("ru-RU")} ₽ · ` : ""}
                      {l.ownerType ? OWNER_LABELS[l.ownerType] + " · " : ""}
                      {new Date(l.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  {canModerate && (
                    <div className="flex flex-wrap gap-2">
                      {l.status === "PENDING_REVIEW" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(l.id)}>
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#FA6868] text-[#FA6868]"
                            onClick={() => setRejectTarget(l.id)}
                          >
                            Отклонить
                          </Button>
                        </>
                      )}
                      {l.status === "ACTIVE" && (
                        <Button size="sm" variant="outline" onClick={() => handleArchive(l.id)}>
                          В архив
                        </Button>
                      )}
                      {l.status === "ARCHIVED" && (
                        <Button size="sm" variant="outline" onClick={() => handleRestore(l.id)}>
                          Восстановить
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
