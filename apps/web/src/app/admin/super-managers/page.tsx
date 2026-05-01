"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { PromoteUserModal } from "@/components/ui/promote-user-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PRIMARY_BTN,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface SuperManager {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  createdAt: string;
}

interface UsersResponse {
  data: SuperManager[];
  total: number;
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f || l) return `${l.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return "?";
}

/* ── page ─────────────────────────────────────────────── */

const LIMIT = 20;

export default function AdminSuperManagersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SuperManager[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    params.set("role", "SUPER_MANAGER");
    if (search) params.set("search", search);
    api<UsersResponse>(`/admin/users?${params.toString()}`, { token })
      .then((res) => {
        setItems(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [user, search, page, reloadKey]);

  return (
    <div>
      <PromoteUserModal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        targetRole="SUPER_MANAGER"
        onSuccess={(u) => {
          const name = [u.lastName, u.firstName].filter(Boolean).join(" ") || u.phone;
          setSuccessMsg(`${name} назначен(а) супер-менеджером`);
          setReloadKey((k) => k + 1);
        }}
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
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Команда</p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Супер-менеджеры
            <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
              {total}
            </span>
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>Расширенный доступ и управление</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setPromoteOpen(true)} className={ADMIN_PRIMARY_BTN}>
            + Назначить супер-менеджера
          </button>
        )}
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
            placeholder="Поиск по ФИО..."
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

      {/* ── Table (desktop) ── */}
      <div className={`hidden md:block ${ADMIN_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ADMIN_TABLE_HEADER}>ФИО</th>
                <th className={ADMIN_TABLE_HEADER}>Телефон</th>
                <th className={ADMIN_TABLE_HEADER}>Статус</th>
                <th className={ADMIN_TABLE_HEADER}>Добавлен</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Супер-менеджеров нет
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr
                    key={m.id}
                    className={`${ADMIN_TABLE_ROW} cursor-pointer`}
                    onClick={() => (window.location.href = `/admin/super-managers/${m.id}`)}
                  >
                    <td className={ADMIN_TABLE_CELL}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center text-xs font-semibold text-[#A1A1A1] shrink-0">
                          {getInitials(m.firstName, m.lastName)}
                        </div>
                        <Link
                          href={`/admin/super-managers/${m.id}`}
                          className="font-medium text-[#1F1F1F] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                        </Link>
                      </div>
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>{m.phone}</td>
                    <td className={ADMIN_TABLE_CELL}>
                      <span className={statusBadgeClass(m.status === "ACTIVE" ? "green" : "grey")}>
                        {m.status === "ACTIVE" ? "Активен" : m.status}
                      </span>
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>
                      {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>
            Супер-менеджеров нет
          </div>
        ) : (
          items.map((m) => (
            <Link key={m.id} href={`/admin/super-managers/${m.id}`} className={`block ${ADMIN_CARD} p-4`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center text-xs font-semibold text-[#A1A1A1] shrink-0">
                  {getInitials(m.firstName, m.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#1F1F1F]">
                      {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                    </h3>
                    <span className={statusBadgeClass(m.status === "ACTIVE" ? "green" : "grey")}>
                      {m.status === "ACTIVE" ? "Активен" : m.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1A1] mt-1">{m.phone}</p>
                  <p className="text-[11px] text-[#A1A1A1] mt-1">
                    Добавлен: {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

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
