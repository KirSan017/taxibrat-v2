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

interface SuperManager {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  email: string;
  sections: Section[];
  status: WorkStatus;
  managersCount: number;
  ticketsHandled: number;
  createdAt: string;
}

const SECTION_LABELS: Record<Section, string> = {
  CHAT: "Чат",
  TAXI_CHECK: "Проверки таксопарков",
  NO_9_PERCENT: "Без 9%",
  USERS: "Пользователи",
  BUYOUT: "Выкуп авто",
};

const MOCK_SM: SuperManager[] = [
  { id: "1", lastName: "Петров", firstName: "Алексей", patronymic: "Иванович", phone: "+7 (999) 001-00-01", email: "a.petrov@taxibrat.ru", sections: ["CHAT", "TAXI_CHECK", "USERS"], status: "WORKING", managersCount: 5, ticketsHandled: 132, createdAt: "02.01.2026" },
  { id: "2", lastName: "Иванова", firstName: "Ольга", patronymic: "Дмитриевна", phone: "+7 (999) 002-00-02", email: "o.ivanova@taxibrat.ru", sections: ["BUYOUT", "NO_9_PERCENT"], status: "WORKING", managersCount: 3, ticketsHandled: 87, createdAt: "15.01.2026" },
  { id: "3", lastName: "Соколов", firstName: "Михаил", patronymic: "Юрьевич", phone: "+7 (999) 003-00-03", email: "m.sokolov@taxibrat.ru", sections: ["CHAT", "USERS", "NO_9_PERCENT", "BUYOUT"], status: "RESTING", managersCount: 4, ticketsHandled: 156, createdAt: "20.01.2026" },
];

/* ── page ─────────────────────────────────────────────── */

export default function AdminSuperManagersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "ALL">("ALL");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addedModalOpen, setAddedModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SuperManager | null>(null);
  const [newSM, setNewSM] = useState({ lastName: "", firstName: "", patronymic: "", phone: "", email: "", sections: [] as Section[] });

  const filtered = MOCK_SM.filter((m) => {
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
    if (search) {
      const full = `${m.lastName} ${m.firstName} ${m.patronymic}`.toLowerCase();
      if (!full.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const toggleNewSection = (s: Section) => {
    setNewSM((n) => ({
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
            <h2 className="text-lg font-medium text-[#303030] mb-4">Добавить супер-менеджера</h2>

            <div className="space-y-3 mb-5">
              <Input label="Фамилия" value={newSM.lastName} onChange={(e) => setNewSM({ ...newSM, lastName: e.target.value })} />
              <Input label="Имя" value={newSM.firstName} onChange={(e) => setNewSM({ ...newSM, firstName: e.target.value })} />
              <Input label="Отчество" value={newSM.patronymic} onChange={(e) => setNewSM({ ...newSM, patronymic: e.target.value })} />
              <Input label="Телефон" placeholder="+7 (___) ___-__-__" value={newSM.phone} onChange={(e) => setNewSM({ ...newSM, phone: e.target.value })} />
              <Input label="Email" type="email" value={newSM.email} onChange={(e) => setNewSM({ ...newSM, email: e.target.value })} />

              <div>
                <p className="block text-sm font-medium text-[#303030] mb-2">Курируемые секции</p>
                <div className="space-y-2">
                  {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-[#303030] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSM.sections.includes(s)}
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
                  setNewSM({ lastName: "", firstName: "", patronymic: "", phone: "", email: "", sections: [] });
                }}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-xl font-medium text-[#303030]">Супер-менеджеры</h1>
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          + Добавить супер-менеджера
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-[280px]">
          <Input placeholder="Поиск по ФИО..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Секции</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Менеджеров</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden lg:table-cell">Тикетов</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/super-managers/${m.id}`} className="text-[#303030] font-medium hover:underline">
                    {m.lastName} {m.firstName} {m.patronymic}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{m.email}</td>
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
                <td className="px-4 py-3 text-[#303030] hidden lg:table-cell">{m.managersCount}</td>
                <td className="px-4 py-3 text-[#303030] hidden lg:table-cell">{m.ticketsHandled}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Супер-менеджеры не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Супер-менеджеры не найдены
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link
                  href={`/admin/super-managers/${m.id}`}
                  className="text-sm font-medium text-[#303030] hover:underline"
                >
                  {m.lastName} {m.firstName} {m.patronymic}
                </Link>
                <Badge variant={m.status === "WORKING" ? "green" : "gray"}>
                  {m.status === "WORKING" ? "Работает" : "Отдыхает"}
                </Badge>
              </div>
              <p className="text-xs text-[#A1A1A1] mb-2">{m.email}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {m.sections.map((s) => (
                  <span key={s} className="text-[10px] bg-gray-100 text-[#303030] px-1.5 py-0.5 rounded">
                    {SECTION_LABELS[s]}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs">
                <span className="text-[#A1A1A1]">
                  Менеджеров: <span className="text-[#303030] font-medium">{m.managersCount}</span> &middot;
                  Тикетов: <span className="text-[#303030] font-medium">{m.ticketsHandled}</span>
                </span>
                <button
                  className="text-[#FA6868] hover:underline"
                  onClick={() => setDeleteTarget(m)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <SuccessModal
        open={addedModalOpen}
        onClose={() => setAddedModalOpen(false)}
        title="Супер-менеджер добавлен"
        description="Приглашение отправлено на указанный email. После активации аккаунт появится в списке."
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удалить супер-менеджера?"
        description={
          deleteTarget
            ? `Вы собираетесь удалить ${deleteTarget.lastName} ${deleteTarget.firstName}. Все курируемые им менеджеры станут свободными.`
            : ""
        }
        confirmLabel="Удалить"
        variant="warning"
        onConfirm={() => setDeleteTarget(null)}
      />
    </div>
  );
}
