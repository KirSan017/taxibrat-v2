"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECTION_TITLE,
  ADMIN_SELECT,
  ADMIN_TEXTAREA,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  DRAFT: { label: "Черновик", variant: "grey" },
  PENDING_REVIEW: { label: "На проверке", variant: "yellow" },
  ACTIVE: { label: "Активно", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "grey" },
};

const FIELD_LABELS: Record<string, string> = {
  title: "Название",
  price: "Цена",
  brandName: "Марка",
  modelName: "Модель",
  year: "Год выпуска",
  mileage: "Пробег",
  vin7: "VIN (7 симв.)",
  description: "Описание",
  ownerType: "Тип владельца",
  ownerName: "Владелец",
  ownerPhone: "Телефон владельца",
  ownerContact: "Доп. контакт",
  ownerAddress: "Адрес",
  status: "Статус",
  createdAt: "Создано",
  updatedAt: "Обновлено",
  isAdvertised: "Реклама",
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
    user?.role === "ADMIN" || user?.role === "SUPER_MANAGER" || user?.role === "MANAGER";

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
      await api(`/admin/buyout/${id}`, { method: "PATCH", token, body });
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

  if (loading && !item) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error && !item) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error}</p>
        <Link href="/admin/buyout" className="text-xs text-[#1F1F1F] underline mt-2 inline-block">
          К списку
        </Link>
      </div>
    );
  }

  if (!item) return null;

  const status = STATUS_CONFIG[item.status] || { label: item.status, variant: "grey" as const };
  const title =
    item.title || `${item.brandName || ""} ${item.modelName || ""}`.trim() || "Без названия";

  return (
    <div className="max-w-[1100px]">
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

      <Link
        href="/admin/buyout"
        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку
      </Link>

      {/* ── Header ── */}
      <div className={`${ADMIN_CARD} p-6 mb-5`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className={ADMIN_PAGE_TITLE}>{title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={statusBadgeClass(status.variant)}>{status.label}</span>
              {item.price != null && (
                <span className="text-lg font-semibold text-[#1F1F1F]">
                  {item.price.toLocaleString("ru-RU")} ₽
                </span>
              )}
              <span className="text-xs text-[#A1A1A1]">
                Создано {new Date(item.createdAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={`${ADMIN_OUTLINE_BTN} h-[40px]`}
              >
                Редактировать
              </button>
            )}
            {canModerate && item.status === "PENDING_REVIEW" && (
              <>
                <button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                >
                  Отклонить
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {item.rejectionReason && item.status === "DRAFT" && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-5">
          <p className="text-[10px] text-[#FA6868] uppercase tracking-wider font-semibold mb-1">
            Причина отказа
          </p>
          <p className="text-sm text-[#1F1F1F]">{item.rejectionReason}</p>
        </div>
      )}

      {/* ── Details ── */}
      <section className={`${ADMIN_CARD} p-5 md:p-6`}>
        <h2 className={`${ADMIN_SECTION_TITLE} mb-5`}>Данные объявления</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {Object.entries(item).map(([k, v]) => {
            if (v == null || typeof v === "object") return null;
            if (k === "id") return null;
            const label = FIELD_LABELS[k] || k;
            return (
              <div
                key={k}
                className="border-b border-[#F2F2F2] pb-3 last:border-0"
              >
                <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-sm text-[#1F1F1F] mt-1 break-all">{String(v)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Approve modal */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !approveSaving && setApproveOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] p-6 md:p-8 w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h3 className="text-[18px] font-semibold text-[#1F1F1F] mb-2">
              Одобрение объявления
            </h3>
            <p className="text-xs text-[#A1A1A1] mb-5">
              Заполните контактные данные владельца перед одобрением.
            </p>
            <div className="space-y-4">
              {[
                { key: "ownerName", label: "ФИО / название" },
                { key: "ownerPhone", label: "Телефон" },
                { key: "ownerContact", label: "Контакт (доп.)" },
                { key: "ownerAddress", label: "Адрес" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  <input
                    value={ownerForm[f.key as keyof typeof ownerForm]}
                    onChange={(e) =>
                      setOwnerForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className={ADMIN_INPUT}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setApproveOpen(false)}
                disabled={approveSaving}
                className={`${ADMIN_OUTLINE_BTN} flex-1`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={approveSaving}
                className="flex-1 inline-flex items-center justify-center h-[44px] px-6 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors disabled:opacity-50"
              >
                {approveSaving ? "Сохранение..." : "Одобрить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !editSaving && setEditOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] p-6 md:p-8 w-full max-w-[640px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h3 className="text-[18px] font-semibold text-[#1F1F1F] mb-5">
              Редактировать объявление
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Название
                </label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Цена, ₽
                </label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Описание
                </label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={ADMIN_TEXTAREA}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Тип владельца
                </label>
                <select
                  value={editForm.ownerType}
                  onChange={(e) => setEditForm((p) => ({ ...p, ownerType: e.target.value }))}
                  className={ADMIN_SELECT}
                >
                  <option value="">—</option>
                  <option value="INDIVIDUAL">Физ лицо</option>
                  <option value="LEGAL_ENTITY">ЮР лицо</option>
                  <option value="TAXI_PARK">Таксопарк</option>
                  <option value="BANK">Банк</option>
                </select>
              </div>
              {[
                { key: "ownerName", label: "Владелец: ФИО / название" },
                { key: "ownerPhone", label: "Владелец: телефон" },
                { key: "ownerContact", label: "Владелец: доп. контакт" },
                { key: "ownerAddress", label: "Владелец: адрес" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  <input
                    value={editForm[f.key as keyof typeof editForm] as string}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className={ADMIN_INPUT}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className={`${ADMIN_OUTLINE_BTN} flex-1`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={editSaving}
                className={`${ADMIN_PRIMARY_BTN} flex-1`}
              >
                {editSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
