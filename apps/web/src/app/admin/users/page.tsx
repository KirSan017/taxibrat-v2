"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken, setTokens } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PILL_ACTIVE,
  ADMIN_PILL_BASE,
  ADMIN_PILL_INACTIVE,
  ADMIN_PRIMARY_BTN,
  ADMIN_SELECT,
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface UserItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  rejectionReason: string | null;
  createdAt: string;
  birthDate?: string | null;
  birthDateHidden?: boolean;
  friendshipPoints?: number;
}

interface UsersResponse {
  data: UserItem[];
  total: number;
  totalBalance?: number;
  page: number;
  limit: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  PHONE_VERIFIED: { label: "Телефон подтверждён", variant: "yellow" },
  PENDING_REVIEW: { label: "На проверке", variant: "blue" },
  ACTIVE: { label: "Активен", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
  BANNED: { label: "Заблокирован", variant: "red" },
};

const ROLE_LABELS: Record<string, string> = {
  USER: "Пользователь",
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

function formatFullName(u: UserItem): string {
  return [u.lastName, u.firstName, u.patronymic].filter(Boolean).join(" ") || "—";
}

function getInitials(u: UserItem): string {
  const f = (u.firstName || "").trim();
  const l = (u.lastName || "").trim();
  if (f || l) return `${l.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return "?";
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") ?? "";
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<"createdAt" | "balance">("createdAt");
  const [totalBalance, setTotalBalance] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [rejectUser, setRejectUser] = useState<UserItem | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 50;
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; firstName: string | null; lastName: string | null }>
  >([]);
  const [dupsByUser, setDupsByUser] = useState<Record<string, number>>({});
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const canSeePhone = currentUser?.role !== "MANAGER";

  const loadUsers = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    api<UsersResponse>(`/admin/users?${params.toString()}`, { token })
      .then(async (res) => {
        setUsers(res.data || []);
        setTotal(res.total || 0);
        setTotalBalance(res.totalBalance ?? 0);
        const token = getAccessToken();
        if (!token) return;
        const map: Record<string, number> = {};
        await Promise.all(
          (res.data || []).map(async (u) => {
            try {
              const dups = await api<Array<{ id: string }>>(
                `/admin/users/${u.id}/duplicates`,
                { token },
              );
              map[u.id] = Array.isArray(dups) ? dups.length : 0;
            } catch {
              map[u.id] = 0;
            }
          }),
        );
        setDupsByUser(map);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!currentUser) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, statusFilter, page, sort]);

  useEffect(() => {
    if (!currentUser || !initialSearch) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, initialSearch]);

  useEffect(() => {
    if (selectedUser) {
      setNewRole(selectedUser.role);
    } else {
      setNewRole("");
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setDuplicates([]);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    api<Array<{ id: string; firstName: string | null; lastName: string | null }>>(
      `/admin/users/${selectedUser.id}/duplicates`,
      { token },
    )
      .then((res) => setDuplicates(Array.isArray(res) ? res : []))
      .catch(() => setDuplicates([]));
  }, [selectedUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleApprove = async (u: UserItem) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/users/${u.id}/approve`, { method: "POST", token });
      setSuccessMsg(`Профиль ${formatFullName(u)} подтверждён`);
      setSelectedUser(null);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось подтвердить");
    }
  };

  const handleReject = async (u: UserItem, reason: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/users/${u.id}/reject`, {
        method: "POST",
        token,
        body: { reason },
      });
      setSuccessMsg(`Профиль ${formatFullName(u)} отклонён`);
      setSelectedUser(null);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить");
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await api<{ accessToken: string }>(
        `/admin/users/${selectedUser.id}/impersonate`,
        { method: "POST", token },
      );
      setTokens(res.accessToken, "");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось войти как пользователь");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole || newRole === selectedUser.role) return;
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(true);
    try {
      await api(`/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        token,
        body: { role: newRole },
      });
      setSuccessMsg(
        `Роль пользователя ${formatFullName(selectedUser)} изменена на «${ROLE_LABELS[newRole] || newRole}»`,
      );
      setRoleConfirmOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось изменить роль");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    const token = getAccessToken();
    if (!token) return;
    setActionLoading(true);
    try {
      await api(`/admin/users/${selectedUser.id}`, {
        method: "DELETE",
        token,
      });
      setSuccessMsg(`Пользователь ${formatFullName(selectedUser)} удалён`);
      setSelectedUser(null);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось удалить пользователя");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <RejectModal
        open={!!rejectUser}
        onClose={() => setRejectUser(null)}
        onConfirm={(reason) => rejectUser && handleReject(rejectUser, reason)}
        description="Укажите причину отклонения профиля. Пользователь получит уведомление."
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />
      <ConfirmModal
        open={impersonateOpen}
        onClose={() => setImpersonateOpen(false)}
        title="Войти как пользователь?"
        description={`Вы перейдёте в аккаунт ${selectedUser ? formatFullName(selectedUser) : ""}. Сессия длится 1 час, все действия будут залогированы.`}
        confirmLabel="Войти"
        onConfirm={handleImpersonate}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить пользователя?"
        description={`Это действие удалит учётную запись ${selectedUser ? formatFullName(selectedUser) : ""} и все связанные данные. Отменить нельзя.`}
        confirmLabel="Удалить"
        variant="warning"
        onConfirm={handleDelete}
      />
      <ConfirmModal
        open={roleConfirmOpen}
        onClose={() => setRoleConfirmOpen(false)}
        title="Изменить роль?"
        description={
          selectedUser
            ? `Изменить роль пользователя ${formatFullName(selectedUser)} с «${ROLE_LABELS[selectedUser.role] || selectedUser.role}» на «${ROLE_LABELS[newRole] || newRole}»?`
            : ""
        }
        confirmLabel="Изменить"
        onConfirm={handleChangeRole}
      />

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-white rounded-[20px] p-6 md:p-8 w-full max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-[#F2F2F2] inline-flex items-center justify-center text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#F8D62E] flex items-center justify-center font-semibold text-[#1F1F1F]">
                {getInitials(selectedUser)}
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#1F1F1F]">
                  {formatFullName(selectedUser)}
                </h2>
                <p className="text-xs text-[#A1A1A1] mt-0.5">
                  {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {canSeePhone && (
                <div>
                  <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                    Телефон
                  </span>
                  <p className="text-sm text-[#1F1F1F] mt-1">{selectedUser.phone}</p>
                </div>
              )}
              {canSeePhone && selectedUser.email && (
                <div>
                  <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                    Email
                  </span>
                  <p className="text-sm text-[#1F1F1F] mt-1 truncate">{selectedUser.email}</p>
                </div>
              )}
              {(selectedUser.birthDate || selectedUser.birthDateHidden) && (
                <div>
                  <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                    Дата рождения
                  </span>
                  <p className="text-sm text-[#1F1F1F] mt-1">
                    {selectedUser.birthDateHidden
                      ? "Скрыто"
                      : selectedUser.birthDate
                        ? new Date(selectedUser.birthDate).toLocaleDateString("ru-RU")
                        : "—"}
                  </p>
                </div>
              )}
              <div>
                <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                  Дата регистрации
                </span>
                <p className="text-sm text-[#1F1F1F] mt-1">
                  {new Date(selectedUser.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                  Статус
                </span>
                <div className="mt-1">
                  <span
                    className={statusBadgeClass(
                      (STATUS_CONFIG[selectedUser.status] || { variant: "grey" as const }).variant,
                    )}
                  >
                    {STATUS_CONFIG[selectedUser.status]?.label || selectedUser.status}
                  </span>
                </div>
              </div>
              {typeof selectedUser.friendshipPoints === "number" && (
                <div>
                  <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium">
                    Баланс баллов
                  </span>
                  <p className="text-sm text-[#1F1F1F] mt-1 font-semibold">
                    {selectedUser.friendshipPoints.toLocaleString("ru-RU")} б.
                  </p>
                </div>
              )}
            </div>

            {selectedUser.rejectionReason && (
              <div className="mb-5 p-3 rounded-[12px] bg-[#FDE8E8] border border-[#FA6868]/30">
                <p className="text-[10px] text-[#FA6868] uppercase tracking-wider font-semibold mb-1">
                  Причина отклонения
                </p>
                <p className="text-sm text-[#FA6868]">{selectedUser.rejectionReason}</p>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="mb-5 p-3 rounded-[12px] bg-[#FEF7DA] border border-[#F8D62E]/40">
                <p className="text-[10px] text-[#9A7C00] uppercase tracking-wider font-semibold mb-2">
                  Дубли по ФИО ({duplicates.length})
                </p>
                <ul className="space-y-1 max-h-[120px] overflow-y-auto">
                  {duplicates.map((d) => {
                    const name = [d.lastName, d.firstName].filter(Boolean).join(" ") || d.id;
                    return (
                      <li key={d.id}>
                        <a
                          href={`/admin/users/${d.id}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs text-[#1F1F1F] hover:underline"
                        >
                          {name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Role changer */}
            {isAdmin && selectedUser.id !== currentUser?.id && (
              <div className="mb-5">
                <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-medium block mb-2">
                  Изменить роль
                </span>
                <div className="flex gap-2 items-center">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className={ADMIN_SELECT}
                    disabled={actionLoading}
                  >
                    <option value="USER">Пользователь</option>
                    <option value="MANAGER">Менеджер</option>
                    <option value="SUPER_MANAGER">Супер-менеджер</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                  <button
                    type="button"
                    disabled={actionLoading || newRole === selectedUser.role}
                    onClick={() => setRoleConfirmOpen(true)}
                    className={ADMIN_OUTLINE_BTN + " whitespace-nowrap"}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}

            {selectedUser.status === "PENDING_REVIEW" && (
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center h-[44px] px-6 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                  onClick={() => handleApprove(selectedUser)}
                >
                  Подтвердить
                </button>
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center h-[44px] px-6 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                  onClick={() => {
                    setRejectUser(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  Отклонить
                </button>
              </div>
            )}

            {isAdmin && selectedUser.id !== currentUser?.id && (
              <div className="pt-4 border-t border-[#F2F2F2] flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => setImpersonateOpen(true)}
                >
                  Войти как пользователь
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-[#FA6868] text-[#FA6868] hover:bg-[#FA6868] hover:text-white"
                  disabled={actionLoading}
                  onClick={() => setDeleteOpen(true)}
                >
                  Удалить
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">База клиентов</p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Пользователи
            <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
              {total}
            </span>
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Общий баланс системы:
            <span className="text-[#1F1F1F] font-semibold ml-1">
              {totalBalance.toLocaleString("ru-RU")} б.
            </span>
          </p>
        </div>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as "createdAt" | "balance");
            setPage(1);
          }}
          className={`${ADMIN_SELECT} w-auto sm:w-[180px]`}
        >
          <option value="createdAt">По дате</option>
          <option value="balance">По балансу</option>
        </select>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["ALL", "PHONE_VERIFIED", "PENDING_REVIEW", "ACTIVE", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`${ADMIN_PILL_BASE} ${
              statusFilter === s ? ADMIN_PILL_ACTIVE : ADMIN_PILL_INACTIVE
            }`}
          >
            {s === "ALL" ? "Все" : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <form onSubmit={handleSearch} className="mb-5 flex flex-wrap gap-2">
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
            placeholder="Поиск по ФИО / телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${ADMIN_INPUT} pl-11`}
          />
        </div>
        <button type="submit" className={ADMIN_PRIMARY_BTN}>
          Найти
        </button>
      </form>

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
                <th className={ADMIN_TABLE_HEADER}>Пользователь</th>
                {canSeePhone && <th className={ADMIN_TABLE_HEADER}>Телефон</th>}
                <th className={ADMIN_TABLE_HEADER}>Роль</th>
                <th className={ADMIN_TABLE_HEADER}>Статус</th>
                <th className={ADMIN_TABLE_HEADER}>Дата регистрации</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={`${ADMIN_TABLE_ROW} cursor-pointer`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className={ADMIN_TABLE_CELL}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center text-xs font-semibold text-[#A1A1A1] shrink-0">
                          {getInitials(u)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[#1F1F1F]">{formatFullName(u)}</span>
                            {dupsByUser[u.id] > 0 && (
                              <span
                                className="inline-flex items-center px-1.5 h-[20px] rounded-full text-[10px] font-semibold bg-[#FDE8E8] text-[#FA6868] cursor-help"
                                title={`Дублей по ФИО: ${dupsByUser[u.id]}`}
                              >
                                Дубли: {dupsByUser[u.id]}
                              </span>
                            )}
                          </div>
                          {!canSeePhone && (
                            <span className="text-xs text-[#A1A1A1]">ID: {u.id.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {canSeePhone && (
                      <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>{u.phone}</td>
                    )}
                    <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </td>
                    <td className={ADMIN_TABLE_CELL}>
                      <span
                        className={statusBadgeClass(
                          (STATUS_CONFIG[u.status] || { variant: "grey" as const }).variant,
                        )}
                      >
                        {STATUS_CONFIG[u.status]?.label || u.status}
                      </span>
                    </td>
                    <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>
                      {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
        ) : users.length === 0 ? (
          <div className={`${ADMIN_CARD} p-8 text-center text-sm text-[#A1A1A1]`}>
            Пользователи не найдены
          </div>
        ) : (
          users.map((u) => {
            const sc = STATUS_CONFIG[u.status] || { variant: "grey" as const, label: u.status };
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full text-left ${ADMIN_CARD} p-4`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center text-xs font-semibold text-[#A1A1A1] shrink-0">
                    {getInitials(u)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#1F1F1F]">{formatFullName(u)}</h3>
                      <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                    </div>
                    {canSeePhone && <p className="text-xs text-[#A1A1A1] mt-1">{u.phone}</p>}
                    <p className="text-[11px] text-[#A1A1A1] mt-1">
                      Регистрация: {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
