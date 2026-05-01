"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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

const ROLE_LABELS: Record<string, string> = {
  USER: "Пользователь",
  MANAGER: "Менеджер",
  SUPER_MANAGER: "Супер-менеджер",
  ADMIN: "Администратор",
};

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f || l) return `${l.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return "?";
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

  if (loading) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error || !manager) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error || "Не найден"}</p>
        <Link
          href="/admin/super-managers"
          className="text-xs text-[#1F1F1F] underline mt-2 inline-block"
        >
          К списку
        </Link>
      </div>
    );
  }

  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="max-w-[1100px]">
      {/* ── Breadcrumb ── */}
      <Link
        href="/admin/super-managers"
        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку
      </Link>

      {/* ── Header ── */}
      <div className={`${ADMIN_CARD} p-6 mb-5`}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F8D62E] flex items-center justify-center text-lg font-semibold text-[#1F1F1F] shrink-0">
            {getInitials(manager.firstName, manager.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={ADMIN_PAGE_TITLE}>{name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm text-[#A1A1A1]">{manager.phone}</span>
              <span
                className={statusBadgeClass(manager.status === "ACTIVE" ? "green" : "grey")}
              >
                {manager.status === "ACTIVE" ? "Активен" : manager.status}
              </span>
              <span className="inline-flex items-center px-2.5 h-[24px] rounded-full text-[11px] font-semibold bg-[#1F1F1F] text-white">
                {ROLE_LABELS[manager.role] || manager.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile ── */}
      <section className={`${ADMIN_CARD} p-5 md:p-6 mb-5`}>
        <h2 className={`${ADMIN_SECTION_TITLE} mb-4`}>Профиль</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Телефон
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">{manager.phone}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Email
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">{manager.email || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Роль
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">
              {ROLE_LABELS[manager.role] || manager.role}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider">
              Дата регистрации
            </p>
            <p className="text-sm text-[#1F1F1F] mt-1">
              {new Date(manager.createdAt).toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Visibility flags (ADMIN only) ── */}
      {isAdmin && manager.role === "SUPER_MANAGER" && (
        <section className={`${ADMIN_CARD} p-5 md:p-6`}>
          <div className="mb-5">
            <h2 className={ADMIN_SECTION_TITLE}>Видимость персональных данных</h2>
            <p className="text-xs text-[#A1A1A1] mt-1">
              По умолчанию супер-менеджер не видит персональные данные пользователей.
              Включите нужные поля индивидуально.
            </p>
          </div>

          <div className="space-y-1">
            {[
              { key: "canViewUserPhone" as const, label: "Телефон пользователя" },
              { key: "canViewUserEmail" as const, label: "Email пользователя" },
              { key: "canViewUserBirthDate" as const, label: "Дата рождения" },
            ].map((f) => {
              const value = !!manager[f.key];
              return (
                <label
                  key={f.key}
                  className="flex items-center justify-between gap-3 py-3.5 border-b border-[#F2F2F2] last:border-0 cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#1F1F1F]">{f.label}</span>
                  <button
                    type="button"
                    disabled={flagSaving === f.key}
                    onClick={() => toggleFlag(f.key)}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                      value ? "bg-[#3BB560]" : "bg-[#E5E5E5]"
                    } ${flagSaving === f.key ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform mt-1 ${
                        value ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>

          {flagMsg && <p className="mt-4 text-xs text-[#A1A1A1]">{flagMsg}</p>}
        </section>
      )}
    </div>
  );
}
