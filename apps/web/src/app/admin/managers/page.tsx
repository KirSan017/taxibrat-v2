"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PromoteUserModal } from "@/components/ui/promote-user-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface ManagerUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

interface UsersResponse {
  data: ManagerUser[];
  total: number;
}

interface ManagerSetting {
  id: string;
  userId: string;
  section: "CHAT" | "TAXI_CHECK" | "NO_9_PERCENT" | "USERS" | "BUYOUT";
  workStatus: "WORKING" | "RESTING";
  updatedAt?: string;
}

const SECTION_LABELS: Record<string, string> = {
  CHAT: "Чат",
  TAXI_CHECK: "Проверка",
  NO_9_PERCENT: "Без 9%",
  USERS: "Польз.",
  BUYOUT: "Выкуп",
};

/* ── page ─────────────────────────────────────────────── */

const LIMIT = 20;

export default function AdminManagersPage() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [settings, setSettings] = useState<ManagerSetting[]>([]);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    api<ManagerSetting[]>("/managers/settings/all", { token })
      .then((res) => setSettings(Array.isArray(res) ? res : []))
      .catch(() => setSettings([]));
  }, [user, reloadKey]);

  const settingsByUser = settings.reduce<Record<string, ManagerSetting[]>>((acc, s) => {
    (acc[s.userId] ||= []).push(s);
    return acc;
  }, {});

  // Reset to page 1 when search changes
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
    params.set("role", "MANAGER");
    if (search) params.set("search", search);
    api<UsersResponse>(`/admin/users?${params.toString()}`, { token })
      .then((res) => {
        setManagers(res.data || []);
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
        targetRole="MANAGER"
        onSuccess={(u) => {
          const name = [u.lastName, u.firstName].filter(Boolean).join(" ") || u.phone;
          setSuccessMsg(`${name} назначен(а) менеджером`);
          setReloadKey((k) => k + 1);
        }}
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Менеджеры</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setPromoteOpen(true)}>
            Назначить нового менеджера
          </Button>
        )}
      </div>

      <div className="mb-6 w-full sm:w-[300px]">
        <Input
          placeholder="Поиск по ФИО..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">ФИО</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Телефон</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Секции</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Активность</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : managers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Менеджеров нет</td></tr>
            ) : managers.map((m) => {
              const mSettings = settingsByUser[m.id] || [];
              const lastUpdate = mSettings.reduce<string | null>((acc, s) => {
                const d = s.updatedAt;
                if (!d) return acc;
                return !acc || new Date(d).getTime() > new Date(acc).getTime() ? d : acc;
              }, null);
              return (
                <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/managers/${m.id}`} className="text-[#303030] font-medium hover:underline">
                      {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                    </Link>
                    <div className="text-[11px] text-[#A1A1A1] mt-0.5">{m.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{m.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {mSettings.length === 0 ? (
                        <span className="text-xs text-[#A1A1A1]">—</span>
                      ) : (
                        mSettings.map((s) => (
                          <span
                            key={s.id}
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                              s.workStatus === "WORKING"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-gray-50 text-[#A1A1A1] border border-gray-200"
                            }`}
                            title={`${SECTION_LABELS[s.section] ?? s.section}: ${s.workStatus === "WORKING" ? "В работе" : "Отдыхает"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.workStatus === "WORKING" ? "bg-green-500" : "bg-[#A1A1A1]"}`} />
                            {SECTION_LABELS[s.section] ?? s.section}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#A1A1A1]">
                    {lastUpdate ? new Date(lastUpdate).toLocaleString("ru-RU") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.status === "ACTIVE" ? "green" : "gray"}>
                      {m.status === "ACTIVE" ? "Активен" : m.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
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
    </div>
  );
}
