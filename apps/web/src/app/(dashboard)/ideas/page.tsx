"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";

/* ── types & mock data ────────────────────────────────── */

type IdeaStatus = "PENDING" | "APPROVED" | "REJECTED" | "IMPLEMENTED";

interface Idea {
  id: string;
  title: string;
  category: string;
  description: string;
  status: IdeaStatus;
  date: string;
}

const STATUS_CONFIG: Record<IdeaStatus, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PENDING: { label: "На рассмотрении", variant: "yellow" },
  APPROVED: { label: "Одобрена", variant: "green" },
  REJECTED: { label: "Отклонена", variant: "red" },
  IMPLEMENTED: { label: "Реализована", variant: "gray" },
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

const MOCK_IDEAS: Idea[] = [
  {
    id: "1",
    title: "Фильтр таксопарков по часам работы",
    category: "Таксопарки",
    description: "Добавить возможность фильтровать парки по времени работы — иногда нужно сменить машину ночью.",
    status: "IMPLEMENTED",
    date: "08.03.2026",
  },
  {
    id: "2",
    title: "Push-уведомления о статусе заказа",
    category: "Мобильное приложение",
    description: "Получать push-уведомления при изменении статуса заказа «По делам» — удобнее, чем проверять вручную.",
    status: "APPROVED",
    date: "25.03.2026",
  },
  {
    id: "3",
    title: "Обмен баллов на топливные карты",
    category: "Баллы дружбы",
    description: "Хотелось бы иметь возможность менять накопленные баллы дружбы на топливные карты.",
    status: "PENDING",
    date: "10.04.2026",
  },
  {
    id: "4",
    title: "Рейтинг диспетчеров парков",
    category: "Таксопарки",
    description: "Дать возможность оценивать не только парк целиком, но и конкретных диспетчеров.",
    status: "REJECTED",
    date: "28.03.2026",
  },
];

/* ── page ─────────────────────────────────────────────── */

export default function IdeasPage() {
  const [ideas, setIdeas] = useState(MOCK_IDEAS);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newIdea: Idea = {
      id: String(Date.now()),
      title,
      category,
      description,
      status: "PENDING",
      date: new Date().toLocaleDateString("ru-RU"),
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setShowForm(false);
    resetForm();
    setSuccess(true);
  };

  return (
    <div className="max-w-[720px]">
      <SuccessModal
        open={success}
        onClose={() => setSuccess(false)}
        title="Спасибо за идею!"
        description="Ваше предложение отправлено на рассмотрение. Мы уведомим вас о статусе."
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

      {/* Ideas list */}
      <div className="space-y-3">
        {ideas.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
            <p className="text-sm text-[#A1A1A1]">Вы ещё не предложили ни одной идеи.</p>
          </div>
        ) : (
          ideas.map((idea) => {
            const sc = STATUS_CONFIG[idea.status];
            return (
              <div
                key={idea.id}
                className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-medium text-[#303030]">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-[#A1A1A1] mt-0.5">
                      {idea.category} &middot; {idea.date}
                    </p>
                  </div>
                  <Badge variant={sc.variant} className="shrink-0">
                    {sc.label}
                  </Badge>
                </div>
                <p className="text-sm text-[#A1A1A1] leading-relaxed">
                  {idea.description}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 md:p-8">
            <button
              onClick={() => setShowForm(false)}
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
                  placeholder="Подробно опишите вашу идею — почему она полезна, как её реализовать..."
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Отправить
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
