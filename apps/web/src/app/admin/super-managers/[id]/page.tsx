"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

interface SuperManagerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  createdAt: string;
  canViewUserPhone?: boolean;
  canViewUserEmail?: boolean;
  canViewUserBirthDate?: boolean;
}

export default function AdminSuperManagerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [manager, setManager] = useState<SuperManagerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flagSaving, setFlagSaving] = useState<string | null>(null);
  const [flagMsg, setFlagMsg] = useState("");

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!id || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<SuperManagerDetail>(`/admin/users/${id}`, { token })
      .then(setManager)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [id, user]);

  const toggleFlag = async (
    flag: "canViewUserPhone" | "canViewUserEmail" | "canViewUserBirthDate",
  ) => {
    if (!manager) return;
    const token = getAccessToken();
    if (!token) return;
    const nextVal = !manager[flag];
    setFlagSaving(flag);
    setFlagMsg("");
    try {
      const updated = await api<SuperManagerDetail>(
        `/admin/users/${manager.id}/visibility-flags`,
        { method: "PATCH", token, body: { [flag]: nextVal } },
      );
      setManager({ ...manager, ...updated });
      setFlagMsg("Сохранено");
      setTimeout(() => setFlagMsg(""), 2000);
    } catch (err: unknown) {
      setFlagMsg(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setFlagSaving(null);
    }
  };

  if (loading) return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;

  if (error || !manager) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error || "Не найден"}</p>
        <Link href="/admin/super-managers" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку
        </Link>
      </div>
    );
  }

  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="max-w-[900px]">
      <Link href="/admin/super-managers" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку
      </Link>
      <h1 className="text-2xl font-medium text-[#303030] mt-2 mb-6">{name}</h1>

      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
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
        </div>
      </section>

      {isAdmin && manager.role === "SUPER_MANAGER" && (
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 mt-6">
          <h2 className="text-base font-medium text-[#303030] mb-1">
            Видимость персональных данных
          </h2>
          <p className="text-xs text-[#A1A1A1] mb-4">
            По умолчанию супер-менеджер не видит персональные данные пользователей.
            Включите нужные поля индивидуально.
          </p>

          <div className="space-y-3">
            {[
              { key: "canViewUserPhone" as const, label: "Телефон пользователя" },
              { key: "canViewUserEmail" as const, label: "Email пользователя" },
              { key: "canViewUserBirthDate" as const, label: "Дата рождения" },
            ].map((f) => {
              const value = !!manager[f.key];
              return (
                <label key={f.key} className="flex items-center justify-between gap-3 py-2 cursor-pointer">
                  <span className="text-sm text-[#303030]">{f.label}</span>
                  <button
                    type="button"
                    disabled={flagSaving === f.key}
                    onClick={() => toggleFlag(f.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      value ? "bg-green-500" : "bg-gray-300"
                    } ${flagSaving === f.key ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                        value ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>

          {flagMsg && (
            <p className="mt-3 text-xs text-[#A1A1A1]">{flagMsg}</p>
          )}
        </section>
      )}
    </div>
  );
}
