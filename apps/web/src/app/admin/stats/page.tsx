"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface ManagerStats {
  id: string;
  firstName: string | null;
  lastName: string | null;
  workStatus?: string;
  ticketsTotal?: number;
  ticketsCompleted?: number;
  ticketsInProgress?: number;
  pointsAwarded?: number;
  activeSince?: string;
}

interface OverallStats {
  [key: string]: unknown;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminStatsPage() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const isAdmin = user?.role === "ADMIN";

  const loadStats = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");

    const range = new URLSearchParams();
    if (from) range.set("from", from);
    if (to) range.set("to", to);

    const promises: Promise<unknown>[] = [
      api<ManagerStats[]>("/admin/stats/managers", { token })
        .then((res) => setManagers(Array.isArray(res) ? res : []))
        .catch(() => setManagers([])),
    ];

    if (isAdmin) {
      promises.push(
        api<OverallStats>(`/admin/stats/overall?${range.toString()}`, { token })
          .then(setOverall)
          .catch(() => setOverall(null)),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from, to]);

  return (
    <div>
      <h1 className="text-xl font-medium text-[#303030] mb-6">Статистика</h1>

      {/* Date range */}
      <div className="flex gap-3 mb-6">
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : (
        <>
          {/* Overall */}
          {isAdmin && overall && (
            <section className="mb-8">
              <h2 className="text-sm font-medium text-[#303030] mb-4">Общая статистика</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(overall).map(([key, value]) => (
                  <div key={key} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
                    <p className="text-xs text-[#A1A1A1] mb-1">{key}</p>
                    <p className="text-xl font-medium text-[#303030]">{String(value ?? "—")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Managers */}
          <section>
            <h2 className="text-sm font-medium text-[#303030] mb-4">Менеджеры</h2>
            {managers.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
                Менеджеров нет
              </div>
            ) : (
              <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Менеджер</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Всего</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Завершено</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Баллы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((m) => (
                      <tr key={m.id} className="border-b border-[#E5E5E5] last:border-0">
                        <td className="px-4 py-3 text-[#303030] font-medium">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {m.workStatus === "WORKING" ? (
                            <span className="text-xs text-green-600 font-medium">Работает</span>
                          ) : (
                            <span className="text-xs text-[#A1A1A1]">Отдыхает</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.ticketsTotal ?? 0}</td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.ticketsCompleted ?? 0}</td>
                        <td className="px-4 py-3 text-right text-[#303030]">{m.pointsAwarded ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
