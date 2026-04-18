"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
}

interface UsersResponse {
  data: ManagerUser[];
  total: number;
}

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
  }, [user, search, page]);

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Менеджеры</h1>

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
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Добавлен</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : managers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Менеджеров нет</td></tr>
            ) : managers.map((m) => (
              <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/managers/${m.id}`} className="text-[#303030] font-medium hover:underline">
                    {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1]">{m.phone}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === "ACTIVE" ? "green" : "gray"}>
                    {m.status === "ACTIVE" ? "Активен" : m.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#A1A1A1]">
                  {new Date(m.createdAt).toLocaleDateString("ru-RU")}
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
    </div>
  );
}
