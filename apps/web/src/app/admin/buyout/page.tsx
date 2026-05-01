"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PILL_ACTIVE,
  ADMIN_PILL_BASE,
  ADMIN_PILL_INACTIVE,
  ADMIN_PRIMARY_BTN,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  DRAFT: { label: "Черновик", variant: "grey" },
  PENDING_REVIEW: { label: "На проверке", variant: "yellow" },
  ACTIVE: { label: "Активно", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "grey" },
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

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Объявления</p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Выкуп авто
            <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
              {total}
            </span>
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>Модерация и публикация объявлений выкупа</p>
        </div>
        <Link href="/admin/buyout/add" className={ADMIN_PRIMARY_BTN}>
          + Добавить
        </Link>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "ARCHIVED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`${ADMIN_PILL_BASE} ${
              statusFilter === s ? ADMIN_PILL_ACTIVE : ADMIN_PILL_INACTIVE
            }`}
          >
            {s === "ALL" ? "Все" : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative w-full sm:max-w-[360px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1A1] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по марке, модели..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${ADMIN_INPUT} pl-11`}
          />
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
          Объявлений нет
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const sc = STATUS_CONFIG[l.status] || { label: l.status, variant: "grey" as const };
            const title =
              l.title || `${l.brandName || ""} ${l.modelName || ""}, ${l.year || ""}`.trim() || "Без названия";
            return (
              <div key={l.id} className={`${ADMIN_CARD} p-4 md:p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Link
                        href={`/admin/buyout/${l.id}`}
                        className="text-[15px] font-semibold text-[#1F1F1F] hover:underline"
                      >
                        {title}
                      </Link>
                      <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
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
                          <button
                            type="button"
                            onClick={() => handleApprove(l.id)}
                            className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(l.id)}
                            className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      {l.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleArchive(l.id)}
                          className={`${ADMIN_OUTLINE_BTN} h-[40px] px-4`}
                        >
                          В архив
                        </button>
                      )}
                      {l.status === "ARCHIVED" && (
                        <button
                          type="button"
                          onClick={() => handleRestore(l.id)}
                          className={`${ADMIN_OUTLINE_BTN} h-[40px] px-4`}
                        >
                          Восстановить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
