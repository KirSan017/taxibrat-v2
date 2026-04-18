"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

interface Buyout {
  id: string;
  title?: string | null;
  price?: number | null;
  status: string;
  ownerType?: string | null;
  year?: number | null;
  brandName?: string | null;
  modelName?: string | null;
  description?: string | null;
  [key: string]: unknown;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
  PENDING_REVIEW: { label: "На проверке", variant: "yellow" },
  ACTIVE: { label: "Активно", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

export default function AdminBuyoutDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [item, setItem] = useState<Buyout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const canModerate = user?.role === "ADMIN" || user?.role === "SUPER_MANAGER";

  const load = () => {
    if (!id || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<Buyout>(`/admin/buyout/${id}`, { token })
      .then(setItem)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleApprove = async () => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${id}/approve`, { method: "POST", token, body: {} });
      setSuccessMsg("Объявление одобрено");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/buyout/${id}/reject`, {
        method: "POST",
        token,
        body: { reason },
      });
      setSuccessMsg("Объявление отклонено");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  if (loading && !item) return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;

  if (error && !item) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error}</p>
        <Link href="/admin/buyout" className="text-xs text-[#303030] underline mt-2 inline-block">К списку</Link>
      </div>
    );
  }

  if (!item) return null;

  const status = STATUS_CONFIG[item.status] || { label: item.status, variant: "gray" as const };
  const title = item.title || `${item.brandName || ""} ${item.modelName || ""}`.trim() || "Без названия";

  return (
    <div className="max-w-[900px]">
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        title="Отклонить объявление"
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <Link href="/admin/buyout" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку
      </Link>

      <div className="flex items-start justify-between gap-3 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-[#303030]">{title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {item.price != null && (
              <span className="text-sm text-[#303030]">{item.price.toLocaleString("ru-RU")} ₽</span>
            )}
          </div>
        </div>

        {canModerate && item.status === "PENDING_REVIEW" && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
              Одобрить
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#FA6868] text-[#FA6868]"
              onClick={() => setRejectOpen(true)}
            >
              Отклонить
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Данные объявления</h2>
        <div className="space-y-3 text-sm">
          {Object.entries(item).map(([k, v]) => {
            if (v == null || typeof v === "object") return null;
            return (
              <div key={k} className="flex justify-between border-b border-[#E5E5E5] pb-2">
                <span className="text-[#A1A1A1]">{k}</span>
                <span className="text-[#303030]">{String(v)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
