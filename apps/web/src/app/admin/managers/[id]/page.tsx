"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { TICKET_TOPIC_LABELS } from "@/lib/labels";

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

interface TicketByTopic {
  topic: string;
  total: number;
  completed: number;
  rejected?: number;
}

interface FirstResponseTime {
  under30s: number;
  s30To1m: number;
  over1m: number;
  avgSeconds?: number;
}

interface OrderResponseBuckets {
  total?: number;
  under1m: number;
  m1To2: number;
  m2To3: number;
  over3m: number;
  avgSeconds?: number;
}

interface ManagerStatsDetail {
  ticketsByTopic?: TicketByTopic[];
  firstResponseTime?: FirstResponseTime;
  orderResponseBuckets?: OrderResponseBuckets;
  smRejections?: number;
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-24 text-[#A1A1A1] text-xs">{label}</div>
      <div className="flex-1 h-6 bg-[#F4F4F4] rounded-md overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-[#F8D62E] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-10 text-right text-[#303030] font-medium">{value}</div>
    </div>
  );
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
        <div className="space-y-4">
          {/* Тикеты по темам */}
          {stats.ticketsByTopic && stats.ticketsByTopic.length > 0 && (
            <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
              <h2 className="text-sm font-medium text-[#303030] mb-4">Тикеты по темам</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5]">
                      <th className="text-left text-xs text-[#A1A1A1] font-normal py-2">Тема</th>
                      <th className="text-right text-xs text-[#A1A1A1] font-normal py-2">Всего</th>
                      <th className="text-right text-xs text-[#A1A1A1] font-normal py-2">Завершено</th>
                      <th className="text-right text-xs text-[#A1A1A1] font-normal py-2">Отклонено СМ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ticketsByTopic.map((row) => (
                      <tr key={row.topic} className="border-b border-[#F4F4F4] last:border-0">
                        <td className="py-2 text-[#303030]">
                          {TICKET_TOPIC_LABELS[row.topic] || row.topic}
                        </td>
                        <td className="py-2 text-right text-[#303030]">{row.total}</td>
                        <td className="py-2 text-right text-[#303030]">{row.completed}</td>
                        <td className="py-2 text-right text-[#303030]">{row.rejected ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Скорость ответа в чатах */}
          {stats.firstResponseTime && (
            <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
              <h2 className="text-sm font-medium text-[#303030] mb-4">
                Скорость ответа в чатах
              </h2>
              {(() => {
                const fr = stats.firstResponseTime;
                const max = Math.max(fr.under30s, fr.s30To1m, fr.over1m, 1);
                return (
                  <div className="space-y-2">
                    <BarRow label="до 30 сек" value={fr.under30s} max={max} />
                    <BarRow label="30 сек — 1 мин" value={fr.s30To1m} max={max} />
                    <BarRow label="более 1 мин" value={fr.over1m} max={max} />
                    {typeof fr.avgSeconds === "number" && fr.avgSeconds > 0 && (
                      <p className="text-xs text-[#A1A1A1] mt-2">
                        Среднее: {fr.avgSeconds} сек
                      </p>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Время выполнения заказов По делам */}
          {stats.orderResponseBuckets && (
            <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
              <h2 className="text-sm font-medium text-[#303030] mb-4">
                Время выполнения заказов «По делам»
              </h2>
              {(() => {
                const ob = stats.orderResponseBuckets;
                const max = Math.max(ob.under1m, ob.m1To2, ob.m2To3, ob.over3m, 1);
                return (
                  <div className="space-y-2">
                    <BarRow label="до 1 мин" value={ob.under1m} max={max} />
                    <BarRow label="1 — 2 мин" value={ob.m1To2} max={max} />
                    <BarRow label="2 — 3 мин" value={ob.m2To3} max={max} />
                    <BarRow label="более 3 мин" value={ob.over3m} max={max} />
                    {typeof ob.avgSeconds === "number" && ob.avgSeconds > 0 && (
                      <p className="text-xs text-[#A1A1A1] mt-2">
                        Среднее: {ob.avgSeconds} сек
                      </p>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Количество доработок от СМ */}
          {typeof stats.smRejections === "number" && (
            <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
              <h2 className="text-sm font-medium text-[#303030] mb-4">
                Количество доработок от СМ
              </h2>
              <p className="text-5xl font-medium text-[#303030]">
                {stats.smRejections}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
