"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api-client";
import { getAccessToken, setTokens } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PHONE_VERIFIED: { label: "Телефон подтверждён", variant: "yellow" },
  PENDING_REVIEW: { label: "На проверке", variant: "gray" },
  ACTIVE: { label: "Активен", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
  BANNED: { label: "Заблокирован", variant: "red" },
};

function formatFullName(u: UserItem): string {
  return [u.lastName, u.firstName, u.patronymic].filter(Boolean).join(" ") || "—";
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
  const [duplicates, setDuplicates] = useState<Array<{ id: string; firstName: string | null; lastName: string | null }>>([]);
  const [dupsByUser, setDupsByUser] = useState<Record<string, number>>({});
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    USER: "Пользователь",
    MANAGER: "Менеджер",
    SUPER_MANAGER: "Супер-менеджер",
    ADMIN: "Администратор",
  };

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
        // Fetch duplicates count per user (best-effort)
        const token = getAccessToken();
        if (!token) return;
        const map: Record<string, number> = {};
        await Promise.all(
          (res.data || []).map(async (u) => {
            try {
              const dups = await api<Array<{ id: string }>>(`/admin/users/${u.id}/duplicates`, { token });
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

  // Если на странице задан ?search=... — загрузить сразу с поиском
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
                <p className="text-sm text-[#303030]">{formatFullName(selectedUser)}</p>
              </div>
              {canSeePhone && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Телефон</span>
                  <p className="text-sm text-[#303030]">{selectedUser.phone}</p>
                </div>
              )}
              {canSeePhone && selectedUser.email && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Email</span>
                  <p className="text-sm text-[#303030]">{selectedUser.email}</p>
                </div>
              )}
              {(selectedUser.birthDate || selectedUser.birthDateHidden) && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Дата рождения</span>
                  <p className="text-sm text-[#303030]">
                    {selectedUser.birthDateHidden
                      ? "Скрыто"
                      : selectedUser.birthDate
                      ? new Date(selectedUser.birthDate).toLocaleDateString("ru-RU")
                      : "—"}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-[#A1A1A1]">Статус</span>
                <div className="mt-1">
                  <Badge variant={(STATUS_CONFIG[selectedUser.status] || { variant: "gray" as const }).variant}>
                    {STATUS_CONFIG[selectedUser.status]?.label || selectedUser.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-[#A1A1A1]">Роль</span>
                {isAdmin && selectedUser.id !== currentUser?.id ? (
                  <div className="mt-1 flex gap-2 items-center">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#303030] focus:outline-none focus:border-[#303030]"
                      disabled={actionLoading}
                    >
                      <option value="USER">Пользователь</option>
                      <option value="MANAGER">Менеджер</option>
                      <option value="SUPER_MANAGER">Супер-менеджер</option>
                      <option value="ADMIN">Администратор</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || newRole === selectedUser.role}
                      onClick={() => setRoleConfirmOpen(true)}
                    >
                      Изменить роль
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[#303030]">
                    {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                  </p>
                )}
              </div>
              <div>
                <span className="text-xs text-[#A1A1A1]">Дата регистрации</span>
                <p className="text-sm text-[#303030]">{new Date(selectedUser.createdAt).toLocaleDateString("ru-RU")}</p>
              </div>
              {selectedUser.rejectionReason && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Причина отклонения</span>
                  <p className="text-sm text-[#FA6868]">{selectedUser.rejectionReason}</p>
                </div>
              )}
              {duplicates.length > 0 && (
                <div>
                  <span className="text-xs text-[#A1A1A1]">Дубли по ФИО</span>
                  <p className="text-sm text-[#F8A828] font-medium mb-1">
                    Найдено: {duplicates.length}
                  </p>
                  <ul className="space-y-0.5 max-h-[120px] overflow-y-auto">
                    {duplicates.map((d) => {
                      const name = [d.lastName, d.firstName].filter(Boolean).join(" ") || d.id;
                      return (
                        <li key={d.id}>
                          <a
                            href={`/admin/users/${d.id}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-[#303030] hover:underline"
                          >
                            {name}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {selectedUser.status === "PENDING_REVIEW" && (
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedUser)}
                >
                  Подтвердить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-[#FA6868] text-[#FA6868] hover:bg-[#FA6868] hover:text-white"
                  onClick={() => {
                    setRejectUser(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  Отклонить
                </Button>
              </div>
            )}

            {isAdmin && selectedUser.id !== currentUser?.id && (
              <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex gap-3">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Пользователи ({total})</h1>
        <p className="text-sm text-[#A1A1A1]">
          Общий баланс системы: <span className="text-[#303030] font-medium">{totalBalance.toLocaleString("ru-RU")}</span> б.
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
        <div className="w-full sm:w-[300px]">
          <Input
            placeholder="Поиск по ФИО / телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" type="submit">Искать</Button>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as "createdAt" | "balance");
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-xs text-[#303030] focus:outline-none focus:border-[#303030]"
        >
          <option value="createdAt">По дате</option>
          <option value="balance">По балансу</option>
        </select>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PHONE_VERIFIED", "PENDING_REVIEW", "ACTIVE", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

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
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Пользователи не найдены</td></tr>
            ) : users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedUser(u)}
              >
                <td className="px-4 py-3 text-[#303030] font-medium">
                  <span className="inline-flex items-center gap-2">
                    {formatFullName(u)}
                    {dupsByUser[u.id] > 0 && (
                      <span
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-[#FA6868]/10 text-[#FA6868] font-medium cursor-help"
                        title={`Найдено дублей по ФИО: ${dupsByUser[u.id]}`}
                      >
                        Дубли: {dupsByUser[u.id]}
                      </span>
                    )}
                  </span>
                </td>
                {canSeePhone && (
                  <td className="px-4 py-3 text-[#A1A1A1] hidden sm:table-cell">{u.phone}</td>
                )}
                <td className="px-4 py-3">
                  <Badge variant={(STATUS_CONFIG[u.status] || { variant: "gray" as const }).variant}>
                    {STATUS_CONFIG[u.status]?.label || u.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1] hidden md:table-cell">
                  {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
            Пользователи не найдены
          </div>
        ) : users.map((u) => {
          const sc = STATUS_CONFIG[u.status] || { variant: "gray" as const, label: u.status };
          return (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="w-full text-left bg-white border border-[#E5E5E5] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="text-sm font-medium text-[#303030]">
                  {formatFullName(u)}
                </h3>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
              {canSeePhone && (
                <p className="text-xs text-[#A1A1A1]">{u.phone}</p>
              )}
              <p className="text-[11px] text-[#A1A1A1] mt-1">
                Регистрация: {new Date(u.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
