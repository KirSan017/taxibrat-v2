"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { RejectModal } from "@/components/ui/reject-modal";

/* ── role & mock data ────────────────────────────────── */

const MOCK_ROLE = "SUPER_MANAGER" as "MANAGER" | "SUPER_MANAGER" | "ADMIN";
const canSeeOwner = MOCK_ROLE === "SUPER_MANAGER" || MOCK_ROLE === "ADMIN";
const canAdvertise = MOCK_ROLE === "ADMIN";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";

const STATUS_CONFIG: Record<Status, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "На проверке", variant: "yellow" },
  APPROVED: { label: "Одобрено", variant: "green" },
  REJECTED: { label: "Отклонено", variant: "red" },
  ARCHIVED: { label: "Архив", variant: "gray" },
};

interface Booking {
  id: string;
  user: string;
  phone: string;
  date: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
}

const MOCK_BOOKINGS: Booking[] = [
  { id: "b1", user: "Иванов И.И.", phone: "+7 (999) 111-22-33", date: "15.04.2026 12:15", status: "NEW" },
  { id: "b2", user: "Петров П.С.", phone: "+7 (999) 222-33-44", date: "14.04.2026 09:45", status: "CONTACTED" },
  { id: "b3", user: "Сидорова М.А.", phone: "+7 (999) 333-44-55", date: "12.04.2026 18:30", status: "CLOSED" },
];

/* ── page ─────────────────────────────────────────────── */

export default function AdminBuyoutDetailPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const [photos, setPhotos] = useState<string[]>(["photo1", "photo2", "photo3", "photo4"]);
  const [activeTab, setActiveTab] = useState<"info" | "bookings">("info");

  const [brand, setBrand] = useState("Kia");
  const [model, setModel] = useState("Rio");
  const [year, setYear] = useState("2022");
  const [price, setPrice] = useState("1150000");
  const [mileage, setMileage] = useState("45000");
  const [vin, setVin] = useState("KNA1234");
  const [description, setDescription] = useState(
    "Автомобиль в отличном состоянии. Один владелец, обслуживался у официального дилера."
  );
  const [advertised, setAdvertised] = useState(true);

  const [ownerName, setOwnerName] = useState("Иванов И.И.");
  const [ownerPhone, setOwnerPhone] = useState("+7 (999) 111-22-33");
  const [ownerType] = useState("Физ. лицо");

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (from: number, to: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      if (to < 0 || to >= next.length) return prev;
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const addPhoto = () => {
    setPhotos((prev) => [...prev, `photo${prev.length + 1}`]);
  };

  const handleApprove = () => {
    setStatus("APPROVED");
    setSuccessMsg("Объявление одобрено и опубликовано");
  };

  const handleReject = (reason: string) => {
    setStatus("REJECTED");
    setSuccessMsg(`Объявление отклонено. Причина: ${reason}`);
  };

  const handleArchive = () => {
    setStatus("ARCHIVED");
    setSuccessMsg("Объявление отправлено в архив");
    setShowArchiveConfirm(false);
  };

  const handleSave = () => {
    setSuccessMsg("Изменения сохранены");
  };

  const sc = STATUS_CONFIG[status];

  return (
    <div>
      <ConfirmModal
        open={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Отправить в архив?"
        description="Объявление перестанет отображаться в публичном каталоге."
        confirmLabel="В архив"
        variant="warning"
      />
      <RejectModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        description="Укажите причину отклонения. Владелец получит уведомление."
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <div className="mb-6">
        <Link
          href="/admin/buyout"
          className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          К списку объявлений
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3">
          <div>
            <h1 className="text-xl md:text-2xl font-medium text-[#303030]">
              {brand} {model} {year}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={sc.variant}>{sc.label}</Badge>
              {advertised && canAdvertise && <Badge variant="green">Рекомендуем</Badge>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FA6868] text-[#FA6868] hover:bg-[#FA6868] hover:text-white"
                  onClick={() => setShowRejectModal(true)}
                >
                  Отклонить
                </Button>
              </>
            )}
            {status !== "ARCHIVED" && status !== "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowArchiveConfirm(true)}
              >
                В архив
              </Button>
            )}
            {status === "ARCHIVED" && (
              <Button size="sm" onClick={() => setStatus("APPROVED")}>
                Восстановить
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === "info" ? "bg-white text-[#303030] shadow-sm" : "text-[#A1A1A1]"
          }`}
        >
          Информация
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === "bookings" ? "bg-white text-[#303030] shadow-sm" : "text-[#A1A1A1]"
          }`}
        >
          Бронирования ({MOCK_BOOKINGS.length})
        </button>
      </div>

      {activeTab === "info" ? (
        <div className="space-y-6">
          {/* Photos */}
          <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
            <h2 className="text-sm font-medium text-[#303030] mb-4">Фотогалерея</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[9px] bg-[#F8D62E] text-[#303030] px-1.5 py-0.5 rounded">
                      Главное
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                    <button
                      onClick={() => movePhoto(i, i - 1)}
                      disabled={i === 0}
                      className="text-white text-xs px-2 py-1 disabled:opacity-30"
                    >
                      &larr;
                    </button>
                    <button
                      onClick={() => removePhoto(i)}
                      className="text-[#FA6868] text-xs px-2 py-1"
                    >
                      Удалить
                    </button>
                    <button
                      onClick={() => movePhoto(i, i + 1)}
                      disabled={i === photos.length - 1}
                      className="text-white text-xs px-2 py-1 disabled:opacity-30"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  type="button"
                  onClick={addPhoto}
                  className="aspect-square border-2 border-dashed border-[#E5E5E5] rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#303030] transition-colors"
                >
                  <svg className="w-6 h-6 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[10px] text-[#A1A1A1]">Добавить</span>
                </button>
              )}
            </div>
          </section>

          {/* Car info */}
          <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6 space-y-4">
            <h2 className="text-sm font-medium text-[#303030]">Данные об автомобиле</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Марка" value={brand} onChange={(e) => setBrand(e.target.value)} />
              <Input label="Модель" value={model} onChange={(e) => setModel(e.target.value)} />
              <Input label="Год выпуска" value={year} onChange={(e) => setYear(e.target.value)} />
              <Input label="Цена, ₽" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input label="Пробег, км" value={mileage} onChange={(e) => setMileage(e.target.value)} />
              <Input label="VIN (7 символов)" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={7} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#303030] mb-1.5">Описание</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] resize-none transition-colors"
              />
            </div>

            {canAdvertise && (
              <label className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvertised((v) => !v)}
                  className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                    advertised ? "bg-[#F8D62E]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${
                      advertised ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-[#303030]">Рекламировать (показывать вверху списка)</span>
              </label>
            )}
          </section>

          {/* Owner info */}
          {canSeeOwner && (
            <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#303030]">Владелец</h2>
                <Badge variant="gray">{ownerType}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="ФИО владельца" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                <Input label="Телефон" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
              <p className="text-[11px] text-[#A1A1A1]">
                Эти данные видят только супер-менеджеры и администраторы.
              </p>
            </section>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave}>Сохранить изменения</Button>
            <Link href="/admin/buyout">
              <Button variant="outline">Отмена</Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Booking history */
        <section className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Телефон</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Дата</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BOOKINGS.map((b) => (
                <tr key={b.id} className="border-b border-[#E5E5E5] last:border-0">
                  <td className="px-4 py-3 text-[#303030]">{b.user}</td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{b.phone}</td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{b.date}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        b.status === "NEW" ? "yellow" : b.status === "CONTACTED" ? "green" : "gray"
                      }
                    >
                      {b.status === "NEW" ? "Новое" : b.status === "CONTACTED" ? "Связались" : "Закрыто"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
