"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────── */

interface Check {
  id: string;
  topic: string;
  status: string;
  title?: string | null;
  body?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
}

interface ChecksResponse {
  data: Check[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "На рассмотрении", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонено", variant: "red" },
  COMPLETED: { label: "Завершена", variant: "green" },
  CANCELLED: { label: "Отменена", variant: "gray" },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "Все" },
  { key: "NEW", label: "На рассмотрении" },
  { key: "IN_PROGRESS", label: "В работе" },
  { key: "COMPLETED", label: "Завершены" },
  { key: "SM_REJECTED", label: "Отклонены" },
];

/* ── page ─────────────────────────────────────────── */

export default function ChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<ChecksResponse>("/tickets?topic=PARK_CHECK&page=1&limit=100", { token })
      .then((res) => setChecks(res.data || []))
      .catch(() => setChecks([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = filter === "ALL" ? checks : checks.filter((c) => c.status === filter);

  return (
    <div className="max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">Проверки таксопарков</h1>
        <Link href="/support/new?topic=PARK_CHECK">
          <Button size="sm">+ Проверить таксопарк</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1] mb-1">Всего проверок</p>
          <p className="text-xl font-medium text-[#303030]">{checks.length}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-xs text-[#A1A1A1] mb-1">Завершено</p>
          <p className="text-xl font-medium text-[#303030]">
            {checks.filter((c) => c.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-[#F8D62E] rounded-xl p-4">
          <p className="text-xs text-[#303030]/70 mb-1">В работе</p>
          <p className="text-xl font-medium text-[#303030]">
            {checks.filter((c) => c.status === "IN_PROGRESS" || c.status === "NEW").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${
              filter === f.key
                ? "bg-[#303030] text-white"
                : "bg-gray-100 text-[#A1A1A1] hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-sm text-[#A1A1A1]">
          Проверок не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const sc = STATUS_CONFIG[c.status] || { label: c.status, variant: "gray" as const };
            return (
              <Link
                key={c.id}
                href={`/support/${c.id}`}
                className="block bg-white border border-[#E5E5E5] rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-medium text-[#303030]">
                    {c.title || "Проверка таксопарка"}
                  </h3>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                {c.body && (
                  <p className="text-xs text-[#A1A1A1] mb-2 line-clamp-2">{c.body}</p>
                )}
                <p className="text-[10px] text-[#A1A1A1]">
                  {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
