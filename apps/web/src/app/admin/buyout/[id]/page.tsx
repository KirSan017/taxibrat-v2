"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ownerName?: string | null;
  ownerContact?: string | null;
  ownerAddress?: string | null;
  ownerPhone?: string | null;
  rejectionReason?: string | null;
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
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveSaving, setApproveSaving] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: "",
    ownerContact: "",
    ownerAddress: "",
    ownerPhone: "",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    price: "",
    description: "",
    ownerType: "",
    ownerName: "",
    ownerContact: "",
    ownerAddress: "",
    ownerPhone: "",
  });

  const canModerate = user?.role === "ADMIN" || user?.role === "SUPER_MANAGER";
  const canEdit =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_MANAGER" ||
    user?.role === "MANAGER";

  const load = () => {
    if (!id || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<Buyout>(`/admin/buyout/${id}`, { token })
      .then((r) => {
        setItem(r);
        setOwnerForm({
          ownerName: r.ownerName || "",
          ownerContact: r.ownerContact || "",
          ownerAddress: r.ownerAddress || "",
          ownerPhone: r.ownerPhone || "",
        });
        setEditForm({
          title: r.title || "",
          price: r.price != null ? String(r.price) : "",
          description: r.description || "",
          ownerType: r.ownerType || "",
          ownerName: r.ownerName || "",
          ownerContact: r.ownerContact || "",
          ownerAddress: r.ownerAddress || "",
          ownerPhone: r.ownerPhone || "",
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleApproveSubmit = async () => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    setApproveSaving(true);
    try {
      // Save owner fields first via PATCH
      await api(`/admin/buyout/${id}`, {
        method: "PATCH",
        token,
        body: {
          ownerName: ownerForm.ownerName || undefined,
          ownerContact: ownerForm.ownerContact || undefined,
          ownerAddress: ownerForm.ownerAddress || undefined,
          ownerPhone: ownerForm.ownerPhone || undefined,
        },
      });
      await api(`/admin/buyout/${id}/approve`, { method: "POST", token, body: {} });
      setApproveOpen(false);
      setSuccessMsg("Объявление одобрено");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setApproveSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        ownerType: editForm.ownerType || undefined,
        ownerName: editForm.ownerName || undefined,
        ownerContact: editForm.ownerContact || undefined,
        ownerAddress: editForm.ownerAddress || undefined,
        ownerPhone: editForm.ownerPhone || undefined,
      };
      if (editForm.price) body.price = Number(editForm.price);
      await api(`/admin/buyout/${id}`, {
        method: "PATCH",
        token,
        body,
      });
      setEditOpen(false);
      setSuccessMsg("Объявление сохранено");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setEditSaving(false);
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

        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Редактировать
            </Button>
          )}
          {canModerate && item.status === "PENDING_REVIEW" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApproveOpen(true)}>
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
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {item.rejectionReason && item.status === "DRAFT" && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-xs font-medium text-[#FA6868] mb-1">Причина отказа</p>
          <p className="text-sm text-[#303030]">{item.rejectionReason}</p>
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

      {/* Approve modal with owner fields */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => !approveSaving && setApproveOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-[520px]">
            <h3 className="text-lg font-medium text-[#303030] mb-2">Одобрение объявления</h3>
            <p className="text-xs text-[#A1A1A1] mb-4">Заполните контактные данные владельца перед одобрением.</p>
            <div className="space-y-3">
              <Input
                label="ФИО/название"
                value={ownerForm.ownerName}
                onChange={(e) => setOwnerForm((p) => ({ ...p, ownerName: e.target.value }))}
              />
              <Input
                label="Телефон"
                value={ownerForm.ownerPhone}
                onChange={(e) => setOwnerForm((p) => ({ ...p, ownerPhone: e.target.value }))}
              />
              <Input
                label="Контакт (доп.)"
                value={ownerForm.ownerContact}
                onChange={(e) => setOwnerForm((p) => ({ ...p, ownerContact: e.target.value }))}
              />
              <Input
                label="Адрес"
                value={ownerForm.ownerAddress}
                onChange={(e) => setOwnerForm((p) => ({ ...p, ownerAddress: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setApproveOpen(false)} disabled={approveSaving}>
                Отмена
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApproveSubmit} disabled={approveSaving}>
                {approveSaving ? "Сохранение..." : "Одобрить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal with full form */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => !editSaving && setEditOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-[640px] max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-[#303030] mb-4">Редактировать объявление</h3>
            <div className="space-y-3">
              <Input
                label="Название"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
              <Input
                label="Цена, ₽"
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
              />
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">Описание</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm outline-none focus:border-[#303030] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">Тип владельца</label>
                <select
                  value={editForm.ownerType}
                  onChange={(e) => setEditForm((p) => ({ ...p, ownerType: e.target.value }))}
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm bg-white"
                >
                  <option value="">—</option>
                  <option value="INDIVIDUAL">Физ лицо</option>
                  <option value="LEGAL_ENTITY">ЮР лицо</option>
                  <option value="TAXI_PARK">Таксопарк</option>
                  <option value="BANK">Банк</option>
                </select>
              </div>
              <Input
                label="Владелец: ФИО/название"
                value={editForm.ownerName}
                onChange={(e) => setEditForm((p) => ({ ...p, ownerName: e.target.value }))}
              />
              <Input
                label="Владелец: телефон"
                value={editForm.ownerPhone}
                onChange={(e) => setEditForm((p) => ({ ...p, ownerPhone: e.target.value }))}
              />
              <Input
                label="Владелец: доп. контакт"
                value={editForm.ownerContact}
                onChange={(e) => setEditForm((p) => ({ ...p, ownerContact: e.target.value }))}
              />
              <Input
                label="Владелец: адрес"
                value={editForm.ownerAddress}
                onChange={(e) => setEditForm((p) => ({ ...p, ownerAddress: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Отмена
              </Button>
              <Button className="flex-1" onClick={handleEditSubmit} disabled={editSaving}>
                {editSaving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
