"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────── */

interface Idea {
  id: string;
  topic: string;
  status: string;
  title?: string | null;
  body?: string | null;
  createdAt: string;
}

interface IdeasResponse {
  data: Idea[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "На рассмотрении", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке", variant: "yellow" },
  SM_REJECTED: { label: "Отклонена", variant: "red" },
  COMPLETED: { label: "Одобрена", variant: "green" },
  CANCELLED: { label: "Отменена", variant: "gray" },
};

const CATEGORIES = [
  "Функциональность сайта",
  "Мобильное приложение",
  "Баллы дружбы",
  "Таксопарки",
  "Заказы «По делам»",
  "Выкуп авто",
  "Другое",
];

const IDEA_MARKER = "[ИДЕЯ]"; // legacy tag kept for backward-compat rendering

/* ── page ─────────────────────────────────────────── */

export default function IdeasPage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");

  const loadIdeas = () => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<IdeasResponse>("/tickets?topic=IDEA&page=1&limit=100", { token })
      .then((res) => setIdeas(res.data || []))
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setSubmitting(true);
    try {
      const body = `[${category}] ${title}\n\n${description}`;
      await api("/tickets", {
        method: "POST",
        token,
        body: { topic: "IDEA", body },
      });
      setShowForm(false);
      resetForm();
      setSuccess(true);
      loadIdeas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить идею");
    } finally {
      setSubmitting(false);
    }
  };

  const parseIdea = (idea: Idea): { category: string; title: string; description: string } => {
    const raw = idea.body || idea.title || "";
    const cleaned = raw.replace(new RegExp(`^${IDEA_MARKER.replace(/[[\]]/g, "\\$&")}\\s*`), "");
    const catMatch = cleaned.match(/^\[([^\]]+)\]\s*(.*)/s);
    if (catMatch) {
      const rest = catMatch[2] || "";
      const nlIdx = rest.indexOf("\n");
      const titleStr = nlIdx === -1 ? rest : rest.slice(0, nlIdx);
      const descStr = nlIdx === -1 ? "" : rest.slice(nlIdx + 2);
      return { category: catMatch[1], title: titleStr.trim(), description: descStr.trim() };
    }
    return { category: "", title: cleaned.slice(0, 80), description: cleaned };
  };

  return (
    <div className="max-w-[720px]">
      <SuccessModal
        open={success}
        onClose={() => setSuccess(false)}
        title="Спасибо за идею!"
        description="Ваше предложение отправлено на рассмотрение."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030]">Мои идеи</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          + Предложить идею
        </Button>
      </div>

      {/* Info block */}
      <div className="bg-[#F3F1E7] rounded-xl p-5 mb-6">
        <p className="text-sm text-[#303030] leading-relaxed">
          Ваши предложения помогают сервису становиться лучше. За одобренные идеи мы начисляем бонусные баллы дружбы.
        </p>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* Ideas list */}
      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : ideas.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1]">Вы ещё не предложили ни одной идеи.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => {
            const sc = STATUS_CONFIG[idea.status] || { label: idea.status, variant: "gray" as const };
            const parsed = parseIdea(idea);
            return (
              <div
                key={idea.id}
                className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-medium text-[#303030]">
                      {parsed.title || "Идея"}
                    </h3>
                    <p className="text-xs text-[#A1A1A1] mt-0.5">
                      {parsed.category ? `${parsed.category} · ` : ""}
                      {new Date(idea.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <Badge variant={sc.variant} className="shrink-0">
                    {sc.label}
                  </Badge>
                </div>
                {parsed.description && (
                  <p className="text-sm text-[#A1A1A1] leading-relaxed">
                    {parsed.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !submitting && setShowForm(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 md:p-8">
            <button
              type="button"
              onClick={() => !submitting && setShowForm(false)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-medium text-[#303030] mb-2">Предложить идею</h2>
            <p className="text-sm text-[#A1A1A1] mb-5">
              Расскажите, что можно улучшить в сервисе.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Название"
                placeholder="Кратко сформулируйте идею"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
              />

              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">
                  Описание
                </label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Подробно опишите вашу идею..."
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => !submitting && setShowForm(false)}
                  disabled={submitting}
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Отправка..." : "Отправить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
