"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";

/* ── types & mock data ────────────────────────────────── */

type Section = "CHAT" | "TAXI_CHECK" | "NO_9_PERCENT" | "USERS" | "BUYOUT";
type WorkStatus = "WORKING" | "RESTING";

interface Manager {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  sections: Section[];
  status: WorkStatus;
  ticketsHandled: number;
  canSeePhones: boolean;
  createdAt: string;
}

const SECTION_LABELS: Record<Section, string> = {
  CHAT: "Чат",
  TAXI_CHECK: "Проверки таксопарков",
  NO_9_PERCENT: "Без 9%",
  USERS: "Пользователи",
  BUYOUT: "Выкуп авто",
};

const MOCK_MANAGERS: Manager[] = [
  { id: "1", lastName: "Козлова", firstName: "Мария", patronymic: "Игоревна", phone: "+7 (999) 111-11-11", sections: ["CHAT", "USERS"], status: "WORKING", ticketsHandled: 42, canSeePhones: true, createdAt: "10.01.2026" },
  { id: "2", lastName: "Смирнов", firstName: "Дмитрий", patronymic: "Олегович", phone: "+7 (999) 222-22-22", sections: ["TAXI_CHECK"], status: "WORKING", ticketsHandled: 31, canSeePhones: false, createdAt: "15.01.2026" },
  { id: "3", lastName: "Новикова", firstName: "Анна", patronymic: "Павловна", phone: "+7 (999) 333-33-33", sections: ["CHAT", "NO_9_PERCENT", "BUYOUT"], status: "RESTING", ticketsHandled: 58, canSeePhones: true, createdAt: "20.01.2026" },
  { id: "4", lastName: "Фёдоров", firstName: "Александр", patronymic: "Николаевич", phone: "+7 (999) 444-44-44", sections: ["BUYOUT"], status: "WORKING", ticketsHandled: 19, canSeePhones: false, createdAt: "02.02.2026" },
  { id: "5", lastName: "Романова", firstName: "Екатерина", patronymic: "Сергеевна", phone: "+7 (999) 555-55-55", sections: ["USERS", "CHAT"], status: "WORKING", ticketsHandled: 27, canSeePhones: true, createdAt: "12.02.2026" },
  { id: "6", lastName: "Белов", firstName: "Игорь", patronymic: "Викторович", phone: "+7 (999) 666-66-66", sections: ["TAXI_CHECK", "NO_9_PERCENT"], status: "RESTING", ticketsHandled: 35, canSeePhones: false, createdAt: "28.02.2026" },
];

/* role — admin can delete, SM can add/edit */
const MOCK_ROLE = "ADMIN" as "SUPER_MANAGER" | "ADMIN";

/* ── page ─────────────────────────────────────────────── */

export default function AdminManagersPage() {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<Section | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "ALL">("ALL");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addedModalOpen, setAddedModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [newManager, setNewManager] = useState({ lastName: "", firstName: "", patronymic: "", phone: "", sections: [] as Section[] });

  const filtered = MOCK_MANAGERS.filter((m) => {
    if (sectionFilter !== "ALL" && !m.sections.includes(sectionFilter)) return false;
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
    if (search) {
      const full = `${m.lastName} ${m.firstName} ${m.patronymic}`.toLowerCase();
      if (!full.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const toggleNewSection = (s: Section) => {
    setNewManager((n) => ({
      ...n,
      sections: n.sections.includes(s) ? n.sections.filter((x) => x !== s) : [...n.sections, s],
    }));
  };

  return (
    <div>
      {/* Add modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setAddModalOpen(false)} />
          <div className="relative bg-white rounded-xl border border-[#E5E5E5] p-6 w-full max-w-[480px] mx-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-medium text-[#303030] mb-4">Добавить менеджера</h2>

            <div className="space-y-3 mb-5">
              <Input
                label="Фамилия"
                value={newManager.lastName}
                onChange={(e) => setNewManager({ ...newManager, lastName: e.target.value })}
              />
              <Input
                label="Имя"
                value={newManager.firstName}
                onChange={(e) => setNewManager({ ...newManager, firstName: e.target.value })}
              />
              <Input
                label="Отчество"
                value={newManager.patronymic}
                onChange={(e) => setNewManager({ ...newManager, patronymic: e.target.value })}
              />
              <Input
                label="Телефон"
                placeholder="+7 (___) ___-__-__"
                value={newManager.phone}
                onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
              />

              <div>
                <p className="block text-sm font-medium text-[#303030] mb-2">Секции работы</p>
                <div className="space-y-2">
                  {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-[#303030] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newManager.sections.includes(s)}
                        onChange={() => toggleNewSection(s)}
                        className="w-4 h-4 accent-[#F8D62E]"
                      />
                      {SECTION_LABELS[s]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setAddModalOpen(false)}>
                Отмена
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setAddModalOpen(false);
                  setAddedModalOpen(true);
                  setNewManager({ lastName: "", firstName: "", patronymic: "", phone: "", sections: [] });
                }}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-xl font-medium text-[#303030]">Менеджеры</h1>
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          + Добавить менеджера
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-[280px]">
          <Input placeholder="Поиск по ФИО..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value as Section | "ALL")}
          className="h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
        >
          <option value="ALL">Все секции</option>
          {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
            <option key={s} value={s}>{SECTION_LABELS[s]}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {(["ALL", "WORKING", "RESTING"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
                statusFilter === s ? "bg-[#303030] text-white" : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : s === "WORKING" ? "Работают" : "Отдыхают"}
            </button>
          ))}
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">ФИО</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Телефон</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Секции</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Тикетов</th>
              {MOCK_ROLE === "ADMIN" && (
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/managers/${m.id}`} className="text-[#303030] font-medium hover:underline">
                    {m.lastName} {m.firstName} {m.patronymic}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{m.phone}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {m.sections.map((s) => (
                      <span key={s} className="text-[10px] bg-gray-100 text-[#303030] px-1.5 py-0.5 rounded">
                        {SECTION_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === "WORKING" ? "green" : "gray"}>
                    {m.status === "WORKING" ? "Работает" : "Отдыхает"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#303030] hidden lg:table-cell">{m.ticketsHandled}</td>
                {MOCK_ROLE === "ADMIN" && (
                  <td className="px-4 py-3">
                    <button
                      className="text-xs text-[#FA6868] hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(m);
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Менеджеры не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Менеджеры не найдены
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link
                  href={`/admin/managers/${m.id}`}
                  className="text-sm font-medium text-[#303030] hover:underline"
                >
                  {m.lastName} {m.firstName} {m.patronymic}
                </Link>
                <Badge variant={m.status === "WORKING" ? "green" : "gray"}>
                  {m.status === "WORKING" ? "Работает" : "Отдыхает"}
                </Badge>
              </div>
              <p className="text-xs text-[#A1A1A1] mb-2">{m.phone}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {m.sections.map((s) => (
                  <span key={s} className="text-[10px] bg-gray-100 text-[#303030] px-1.5 py-0.5 rounded">
                    {SECTION_LABELS[s]}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                <span className="text-xs text-[#A1A1A1]">
                  Обработано тикетов: <span className="text-[#303030] font-medium">{m.ticketsHandled}</span>
                </span>
                {MOCK_ROLE === "ADMIN" && (
                  <button
                    className="text-xs text-[#FA6868] hover:underline"
                    onClick={() => setDeleteTarget(m)}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <SuccessModal
        open={addedModalOpen}
        onClose={() => setAddedModalOpen(false)}
        title="Менеджер добавлен"
        description="Приглашение отправлено на указанный телефон. После регистрации менеджер появится в списке активных."
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удалить менеджера?"
        description={
          deleteTarget
            ? `Вы собираетесь удалить ${deleteTarget.lastName} ${deleteTarget.firstName}. Это действие нельзя отменить.`
            : ""
        }
        confirmLabel="Удалить"
        variant="warning"
        onConfirm={() => setDeleteTarget(null)}
      />
    </div>
  );
}
