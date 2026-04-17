"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── types & mock data ────────────────────────────────── */

type UserStatus = "PHONE_VERIFIED" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED";

interface User {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  status: UserStatus;
  registeredAt: string;
}

const MOCK_USERS: User[] = [
  { id: "1", lastName: "Иванов", firstName: "Иван", patronymic: "Иванович", phone: "+7 (999) 123-45-67", status: "ACTIVE", registeredAt: "14.04.2026" },
  { id: "2", lastName: "Петров", firstName: "Пётр", patronymic: "Сергеевич", phone: "+7 (999) 234-56-78", status: "PENDING_REVIEW", registeredAt: "12.04.2026" },
  { id: "3", lastName: "Сидорова", firstName: "Мария", patronymic: "Алексеевна", phone: "+7 (999) 345-67-89", status: "PHONE_VERIFIED", registeredAt: "10.04.2026" },
  { id: "4", lastName: "Козлов", firstName: "Алексей", patronymic: "Дмитриевич", phone: "+7 (999) 456-78-90", status: "REJECTED", registeredAt: "08.04.2026" },
  { id: "5", lastName: "Смирнов", firstName: "Дмитрий", patronymic: "Олегович", phone: "+7 (999) 567-89-01", status: "ACTIVE", registeredAt: "05.04.2026" },
  { id: "6", lastName: "Кузнецова", firstName: "Анна", patronymic: "Павловна", phone: "+7 (999) 678-90-12", status: "PENDING_REVIEW", registeredAt: "03.04.2026" },
  { id: "7", lastName: "Попов", firstName: "Роман", patronymic: "Викторович", phone: "+7 (999) 789-01-23", status: "ACTIVE", registeredAt: "01.04.2026" },
  { id: "8", lastName: "Новикова", firstName: "Елена", patronymic: "Андреевна", phone: "+7 (999) 890-12-34", status: "PHONE_VERIFIED", registeredAt: "28.03.2026" },
];

const STATUS_CONFIG: Record<UserStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PHONE_VERIFIED: { label: "Телефон подтверждён", variant: "yellow" },
  PENDING_REVIEW: { label: "На проверке", variant: "gray" },
  ACTIVE: { label: "Активен", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
};

/* ── mock role: managers can't see phone ──────────────── */
const MOCK_ROLE = "ADMIN" as "MANAGER" | "SUPER_MANAGER" | "ADMIN";

/* ── page ─────────────────────────────────────────────── */

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (search) {
      const full = `${u.lastName} ${u.firstName} ${u.patronymic}`.toLowerCase();
      if (!full.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const canSeePhone = MOCK_ROLE !== "MANAGER";

  return (
    <div>
      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-white rounded-xl border border-[#E5E5E5] p-6 w-full max-w-[440px] mx-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-medium text-[#303030] mb-4">Пользователь</h2>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-xs text-[#A1A1A1]">ФИО</span>
                <p className="text-sm text-[#303030]">{selectedUser.lastName} {selectedUser.firstName} {selectedUser.patronymic}</p>
              </div>
              {canSeePhone && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Телефон</span>
                  <p className="text-sm text-[#303030]">{selectedUser.phone}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-[#A1A1A1]">Статус</span>
                <div className="mt-1">
                  <Badge variant={STATUS_CONFIG[selectedUser.status].variant}>
                    {STATUS_CONFIG[selectedUser.status].label}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-[#A1A1A1]">Дата регистрации</span>
                <p className="text-sm text-[#303030]">{selectedUser.registeredAt}</p>
              </div>
            </div>

            {(selectedUser.status === "PENDING_REVIEW" || selectedUser.status === "PHONE_VERIFIED") && (
              <div className="flex gap-3">
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setSelectedUser(null)}>
                  Подтвердить
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-[#FA6868] text-[#FA6868] hover:bg-[#FA6868] hover:text-white" onClick={() => setSelectedUser(null)}>
                  Отклонить
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="text-xl font-medium text-[#303030] mb-6">Пользователи</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-[300px]">
          <Input
            placeholder="Поиск по ФИО..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PHONE_VERIFIED", "PENDING_REVIEW", "ACTIVE", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_CONFIG[s].label}
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
              {canSeePhone && (
                <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden sm:table-cell">Телефон</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider hidden md:table-cell">Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const sc = STATUS_CONFIG[user.status];
              return (
                <tr
                  key={user.id}
                  className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-4 py-3 text-[#303030] font-medium">
                    {user.lastName} {user.firstName} {user.patronymic}
                  </td>
                  {canSeePhone && (
                    <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{user.phone}</td>
                  )}
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">{user.registeredAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Пользователи не найдены</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Пользователи не найдены
          </div>
        ) : (
          filtered.map((user) => {
            const sc = STATUS_CONFIG[user.status];
            return (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="w-full text-left bg-white border border-[#E5E5E5] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="text-sm font-medium text-[#303030]">
                    {user.lastName} {user.firstName} {user.patronymic}
                  </h3>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                {canSeePhone && (
                  <p className="text-xs text-[#A1A1A1]">{user.phone}</p>
                )}
                <p className="text-[11px] text-[#A1A1A1] mt-1">
                  Регистрация: {user.registeredAt}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
