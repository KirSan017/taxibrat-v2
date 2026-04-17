"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RejectModal } from "@/components/ui/reject-modal";

/* ── types & mock data ────────────────────────────────── */

type BuyoutStatus = "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
type OwnerType = "USER" | "PARK" | "ADMIN";

interface BuyoutListing {
  id: string;
  title: string;
  price: string;
  status: BuyoutStatus;
  ownerType: OwnerType;
  date: string;
  ownerName: string;
}

const MOCK_LISTINGS: BuyoutListing[] = [
  { id: "1", title: "Hyundai Solaris 2023, белый", price: "1 200 000", status: "PENDING", ownerType: "USER", date: "16.04.2026", ownerName: "Иванов И.И." },
  { id: "2", title: "Kia Rio 2022, серебро", price: "980 000", status: "APPROVED", ownerType: "PARK", date: "14.04.2026", ownerName: "Таксопарк «Альфа»" },
  { id: "3", title: "Skoda Octavia 2024, чёрный", price: "2 100 000", status: "APPROVED", ownerType: "USER", date: "12.04.2026", ownerName: "Петров П.С." },
  { id: "4", title: "Toyota Camry 2022, белый", price: "2 800 000", status: "REJECTED", ownerType: "USER", date: "10.04.2026", ownerName: "Сидорова М.А." },
  { id: "5", title: "Volkswagen Polo 2023, серый", price: "1 100 000", status: "ARCHIVED", ownerType: "ADMIN", date: "08.04.2026", ownerName: "Администратор" },
  { id: "6", title: "Renault Logan 2023, синий", price: "890 000", status: "PENDING", ownerType: "USER", date: "05.04.2026", ownerName: "Козлов А.Д." },
];

const STATUS_CONFIG: Record<BuyoutStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "На проверке", variant: "yellow" },
  APPROVED: { label: "Одобрено", variant: "green" },
  REJECTED: { label: "Отклонено", variant: "red" },
  ARCHIVED: { label: "Архив", variant: "gray" },
};

const OWNER_LABELS: Record<OwnerType, string> = {
  USER: "Пользователь",
  PARK: "Таксопарк",
  ADMIN: "Администратор",
};

/* ── create form ──────────────────────────────────────── */

function CreateForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-[#E5E5E5] p-6 w-full max-w-[480px] mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-medium text-[#303030] mb-4">Новое объявление</h2>

        <div className="space-y-4 mb-6">
          <Input label="Заголовок" placeholder="Hyundai Solaris 2023, белый" />
          <Input label="Цена, руб." placeholder="1 200 000" />
          <div className="w-full">
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Описание</label>
            <textarea
              rows={4}
              placeholder="Описание автомобиля..."
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1">Создать</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminBuyoutPage() {
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<BuyoutListing | null>(null);

  const handleAction = (id: string, action: "approve" | "archive" | "restore") => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const statusMap: Record<string, BuyoutStatus> = {
          approve: "APPROVED",
          archive: "ARCHIVED",
          restore: "PENDING",
        };
        return { ...l, status: statusMap[action] };
      })
    );
  };

  const handleReject = (id: string, _reason: string) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "REJECTED" as BuyoutStatus } : l))
    );
  };

  return (
    <div>
      {showCreate && <CreateForm onClose={() => setShowCreate(false)} />}

      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) handleReject(rejectTarget.id, reason);
        }}
        description={`Объявление «${rejectTarget?.title ?? ""}» будет отклонено. Владелец получит уведомление.`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Выкуп авто</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>Быстро</Button>
          <Link href="/admin/buyout/add">
            <Button size="sm">+ Добавить объявление</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Заголовок</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Цена</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Тип владельца</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Дата</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => {
              const sc = STATUS_CONFIG[listing.status];
              return (
                <tr key={listing.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/buyout/${listing.id}`}
                      className="block group"
                    >
                      <p className="text-[#303030] font-medium group-hover:underline">{listing.title}</p>
                      <p className="text-xs text-[#A1A1A1]">{listing.ownerName}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#303030] hidden sm:table-cell">{listing.price} &#8381;</td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">{OWNER_LABELS[listing.ownerType]}</td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden lg:table-cell">{listing.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {listing.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(listing.id, "approve")}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => setRejectTarget(listing)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-[#FA6868]/10 text-[#FA6868] hover:bg-[#FA6868]/20 transition-colors"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      {listing.status === "APPROVED" && (
                        <button
                          onClick={() => handleAction(listing.id, "archive")}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-[#A1A1A1] hover:bg-gray-200 transition-colors"
                        >
                          В архив
                        </button>
                      )}
                      {listing.status === "ARCHIVED" && (
                        <button
                          onClick={() => handleAction(listing.id, "restore")}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-[#303030] hover:bg-gray-200 transition-colors"
                        >
                          Восстановить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
