"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

interface Candidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
}

interface SearchResponse {
  data: Candidate[];
  total: number;
}

interface PromoteUserModalProps {
  open: boolean;
  onClose: () => void;
  targetRole: "MANAGER" | "SUPER_MANAGER";
  onSuccess?: (user: Candidate) => void;
}

const TARGET_LABEL: Record<string, string> = {
  MANAGER: "менеджером",
  SUPER_MANAGER: "супер-менеджером",
};

export function PromoteUserModal({ open, onClose, targetRole, onSuccess }: PromoteUserModalProps) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setCandidates([]);
      setSelected(null);
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const token = getAccessToken();
    if (!token) return;
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setCandidates([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "20");
    params.set("role", "USER");
    params.set("search", trimmed);

    const timer = setTimeout(() => {
      api<SearchResponse>(`/admin/users?${params.toString()}`, { token })
        .then((res) => setCandidates(res.data || []))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка поиска"))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  const handleConfirm = async () => {
    if (!selected) return;
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      await api(`/admin/users/${selected.id}/role`, {
        method: "PATCH",
        token,
        body: { role: targetRole },
      });
      onSuccess?.(selected);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось изменить роль");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const fullName = (u: Candidate) =>
    [u.lastName, u.firstName].filter(Boolean).join(" ") || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-[480px] mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-medium text-[#303030] mb-1">
          Назначить {targetRole === "MANAGER" ? "нового менеджера" : "супер-менеджера"}
        </h2>
        <p className="text-xs text-[#A1A1A1] mb-4">
          Найдите пользователя по ФИО или телефону
        </p>

        <Input
          placeholder="Поиск по ФИО / телефону..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
          autoFocus
        />

        {error && (
          <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-3 mt-3">
            <p className="text-xs text-[#FA6868]">{error}</p>
          </div>
        )}

        <div className="mt-4 max-h-[280px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#A1A1A1] py-4 text-center">Поиск…</p>
          ) : search.trim().length < 2 ? (
            <p className="text-xs text-[#A1A1A1] py-4 text-center">
              Введите минимум 2 символа для поиска
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-[#A1A1A1] py-4 text-center">Ничего не найдено</p>
          ) : (
            <ul className="space-y-1">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      selected?.id === c.id
                        ? "border-[#303030] bg-gray-50"
                        : "border-[#E5E5E5] hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-sm text-[#303030] font-medium">{fullName(c)}</div>
                    <div className="text-xs text-[#A1A1A1]">{c.phone}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-[#E5E5E5]">
            <p className="text-xs text-[#A1A1A1] mb-1">Выбран пользователь:</p>
            <p className="text-sm text-[#303030] font-medium">{fullName(selected)}</p>
            <p className="text-xs text-[#A1A1A1]">{selected.phone}</p>
            <p className="text-xs text-[#303030] mt-2">
              Сделать {TARGET_LABEL[targetRole]}?
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            disabled={!selected || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Назначение…" : "Назначить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
