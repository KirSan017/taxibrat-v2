"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface ManagerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  createdAt: string;
}

interface ManagerStatsDetail {
  ticketsTotal?: number;
  ticketsCompleted?: number;
  ticketsInProgress?: number;
  pointsAwarded?: number;
  [key: string]: unknown;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminManagerDetailPage() {
  const params = useParams();
  const managerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [manager, setManager] = useState<ManagerDetail | null>(null);
  const [stats, setStats] = useState<ManagerStatsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!managerId || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<ManagerDetail>(`/admin/users/${managerId}`, { token })
        .then(setManager)
        .catch(() => {}),
      api<ManagerStatsDetail>(`/admin/stats/managers/${managerId}`, { token })
        .then(setStats)
        .catch(() => {}),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [managerId, user]);

  if (loading) return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;

  if (error || !manager) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error || "Менеджер не найден"}</p>
        <Link href="/admin/managers" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку менеджеров
        </Link>
      </div>
    );
  }

  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="max-w-[900px]">
      <Link href="/admin/managers" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку менеджеров
      </Link>
      <h1 className="text-2xl font-medium text-[#303030] mt-2 mb-6">{name}</h1>

      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 mb-4">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Данные</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#A1A1A1]">Телефон</p>
            <p className="text-[#303030]">{manager.phone}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Email</p>
            <p className="text-[#303030]">{manager.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Роль</p>
            <p className="text-[#303030]">{manager.role}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Статус</p>
            <Badge variant={manager.status === "ACTIVE" ? "green" : "gray"}>
              {manager.status === "ACTIVE" ? "Активен" : manager.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Дата регистрации</p>
            <p className="text-[#303030]">
              {new Date(manager.createdAt).toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>
      </section>

      {stats && (
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-4">Статистика</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="border border-[#E5E5E5] rounded-xl p-3">
                <p className="text-xs text-[#A1A1A1]">{k}</p>
                <p className="text-lg font-medium text-[#303030]">{String(v ?? "—")}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
