"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";

/* ── types & mock data ────────────────────────────────── */

type ParkListStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

interface ParkListEntry {
  id: string;
  name: string;
  driverClass: string;
  rating: number;
  rent: number;
  commission: number;
  advertised: boolean;
  status: ParkListStatus;
  addedAt: string;
}

const INITIAL_PARKS: ParkListEntry[] = [
  { id: "1", name: "СитиМобил Парк", driverClass: "Эконом", rating: 4.25, rent: 2000, commission: 2, advertised: true, status: "ACTIVE", addedAt: "10.01.2026" },
  { id: "2", name: "Альфа", driverClass: "Комфорт", rating: 4.55, rent: 2500, commission: 3, advertised: false, status: "ACTIVE", addedAt: "15.01.2026" },
  { id: "3", name: "Драйв Парк", driverClass: "Бизнес", rating: 4.84, rent: 3500, commission: 1, advertised: true, status: "ACTIVE", addedAt: "20.01.2026" },
  { id: "4", name: "Мега Такси", driverClass: "Эконом", rating: 3.92, rent: 1700, commission: 3, advertised: false, status: "ACTIVE", addedAt: "02.02.2026" },
  { id: "5", name: "Премьер Авто", driverClass: "Комфорт+", rating: 4.65, rent: 3000, commission: 2, advertised: false, status: "DRAFT", addedAt: "12.02.2026" },
  { id: "6", name: "Экспресс Парк", driverClass: "Эконом", rating: 4.12, rent: 1900, commission: 2, advertised: false, status: "ACTIVE", addedAt: "20.02.2026" },
  { id: "7", name: "Голд Такси", driverClass: "Бизнес", rating: 4.78, rent: 4000, commission: 1, advertised: false, status: "ARCHIVED", addedAt: "01.03.2026" },
];

const STATUS_CONFIG: Record<ParkListStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  ACTIVE: { label: "Активен", variant: "green" },
  DRAFT: { label: "Черновик", variant: "yellow" },
  ARCHIVED: { label: "Архив", variant: "gray" },
};

const CLASSES = ["Эконом", "Комфорт", "Комфорт+", "Бизнес"];

/* ── page ─────────────────────────────────────────────── */

export default function AdminParksListPage() {
  const [parks, setParks] = useState(INITIAL_PARKS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ParkListStatus | "ALL">("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<ParkListEntry | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState(CLASSES[0]);
  const [newRent, setNewRent] = useState("");
  const [newCommission, setNewCommission] = useState("");

  const filtered = parks.filter((p) => {
    if (filter !== "ALL" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleAdvertised = (id: string) => {
    setParks((prev) =>
      prev.map((p) => (p.id === id ? { ...p, advertised: !p.advertised } : p))
    );
  };

  const handleArchiveToggle = (park: ParkListEntry) => {
    if (park.status === "ARCHIVED") {
      setParks((prev) =>
        prev.map((p) => (p.id === park.id ? { ...p, status: "ACTIVE" } : p))
      );
      setSuccessMsg("Таксопарк восстановлен");
    } else {
      setConfirmArchive(park);
    }
  };

  const confirmArchiveAction = () => {
    if (!confirmArchive) return;
    setParks((prev) =>
      prev.map((p) => (p.id === confirmArchive.id ? { ...p, status: "ARCHIVED" } : p))
    );
    setSuccessMsg("Таксопарк отправлен в архив");
    setConfirmArchive(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: ParkListEntry = {
      id: String(Date.now()),
      name: newName,
      driverClass: newClass,
      rating: 0,
      rent: Number(newRent) || 0,
      commission: Number(newCommission) || 0,
      advertised: false,
      status: "DRAFT",
      addedAt: new Date().toLocaleDateString("ru-RU"),
    };
    setParks((prev) => [entry, ...prev]);
    setNewName("");
    setNewRent("");
    setNewCommission("");
    setNewClass(CLASSES[0]);
    setShowAdd(false);
    setSuccessMsg("Таксопарк добавлен как черновик");
  };

  return (
    <div>
      <ConfirmModal
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={confirmArchiveAction}
        title="Отправить в архив?"
        description={`Парк «${confirmArchive?.name ?? ""}» перестанет отображаться в публичном каталоге.`}
        confirmLabel="В архив"
        variant="warning"
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Список таксопарков</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Добавить таксопарк</Button>
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
          {(["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
                filter === s
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Класс</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Рейтинг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Аренда</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Комиссия</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Реклама</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const sc = STATUS_CONFIG[p.status];
              return (
                <tr key={p.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#303030] font-medium">{p.name}</p>
                    <p className="text-xs text-[#A1A1A1]">добавлен {p.addedAt}</p>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{p.driverClass}</td>
                  <td className="px-4 py-3 text-[#303030]">{p.rating.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#303030]">{p.rent.toLocaleString("ru-RU")} ₽</td>
                  <td className="px-4 py-3 text-[#303030]">{p.commission}%</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdvertised(p.id)}
                      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                        p.advertised ? "bg-[#F8D62E]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${
                          p.advertised ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleArchiveToggle(p)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-[#303030] hover:bg-gray-200 transition-colors"
                      >
                        {p.status === "ARCHIVED" ? "Восстановить" : "В архив"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Таксопарки не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Таксопарки не найдены
          </div>
        ) : (
          filtered.map((p) => {
            const sc = STATUS_CONFIG[p.status];
            return (
              <div key={p.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#303030]">{p.name}</h3>
                    <p className="text-xs text-[#A1A1A1] mt-0.5">
                      {p.driverClass} &middot; добавлен {p.addedAt}
                    </p>
                  </div>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-[#A1A1A1]">Рейтинг</p>
                    <p className="font-medium text-[#303030]">{p.rating.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[#A1A1A1]">Аренда</p>
                    <p className="font-medium text-[#303030]">{p.rent.toLocaleString("ru-RU")}</p>
                  </div>
                  <div>
                    <p className="text-[#A1A1A1]">Комиссия</p>
                    <p className="font-medium text-[#303030]">{p.commission}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                  <label className="flex items-center gap-2 text-xs text-[#303030]">
                    <button
                      onClick={() => toggleAdvertised(p.id)}
                      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                        p.advertised ? "bg-[#F8D62E]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${
                          p.advertised ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    Реклама
                  </label>
                  <button
                    onClick={() => handleArchiveToggle(p)}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-[#303030]"
                  >
                    {p.status === "ARCHIVED" ? "Восстановить" : "В архив"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 md:p-8">
            <button
              onClick={() => setShowAdd(false)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-medium text-[#303030] mb-2">Добавить таксопарк</h2>
            <p className="text-sm text-[#A1A1A1] mb-5">
              Новый парк будет сохранён как черновик.
            </p>

            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label="Название"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">Класс</label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Аренда, ₽/сутки"
                  type="number"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                  required
                />
                <Input
                  label="Комиссия, %"
                  type="number"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">Сохранить</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
