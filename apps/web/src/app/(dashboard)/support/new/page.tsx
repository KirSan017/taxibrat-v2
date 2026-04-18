"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── topics (8 items per ТЗ) ──────────────────────────── */

interface Topic {
  key: string;
  label: string;
  description?: string;
  costPoints?: number;
  redirectTo?: string;
}

const TOPICS: Topic[] = [
  { key: "PARK_CHECK", label: "Проверка Таксопарка" },
  { key: "USER_BASE_CHECK", label: "Проверка по Базе", description: "Стоит 50 баллов", costPoints: 50 },
  { key: "TAXI_CONNECT", label: "Подключение к Такси" },
  { key: "BUYOUT", label: "Выкуп авто" },
  { key: "OTHER_NO9", label: "Заказ «По делам»", redirectTo: "/no9" },
  { key: "LEGAL", label: "Юридический вопрос" },
  { key: "FRIENDSHIP_POINTS", label: "Баллы дружбы" },
  { key: "OTHER", label: "Иное" },
];

/* ── form content ─────────────────────────────────────── */

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");
  const { user } = useAuth();

  const [topicKey, setTopicKey] = useState<string>(() => {
    const match = TOPICS.find((t) => t.key === topicParam);
    return match ? match.key : TOPICS[0].key;
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentTopic = TOPICS.find((t) => t.key === topicKey) ?? TOPICS[0];

  // Handle redirect-type topics (e.g., OTHER_NO9 -> /no9)
  useEffect(() => {
    if (currentTopic.redirectTo) {
      router.replace(currentTopic.redirectTo);
    }
  }, [currentTopic, router]);

  const displayBalance = (user?.friendshipPoints || 0) + 615;
  const hasEnoughPoints = !currentTopic.costPoints || displayBalance >= currentTopic.costPoints;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasEnoughPoints) {
      setError(`Недостаточно баллов. Требуется ${currentTopic.costPoints}, у вас ${displayBalance}.`);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    // Map frontend topic key to backend enum
    // OTHER_NO9 is a frontend-only redirect; all others are real topics
    const backendTopic = currentTopic.redirectTo ? "OTHER" : currentTopic.key;

    setSubmitting(true);
    try {
      const ticket = await api<{ id: string }>("/tickets", {
        method: "POST",
        token,
        body: { topic: backendTopic, body: message },
      });
      router.push(`/support/${ticket.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать тикет");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[720px]">
      <div className="mb-6">
        <Link
          href="/support"
          className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          К списку тикетов
        </Link>
        <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mt-3">
          Новое обращение
        </h1>
        <p className="text-sm text-[#A1A1A1] mt-2">
          Выберите тему обращения и опишите ситуацию. Менеджер ответит в течение 1 рабочего дня.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic */}
        <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-4">Тема обращения</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTopicKey(t.key)}
                className={`text-left px-4 py-3 rounded-lg text-sm border transition-colors ${
                  topicKey === t.key
                    ? "bg-[#303030] text-white border-[#303030]"
                    : "bg-white text-[#303030] border-[#E5E5E5] hover:border-[#303030]"
                }`}
              >
                <div>{t.label}</div>
                {t.description && (
                  <div className={`text-xs mt-0.5 ${topicKey === t.key ? "text-white/70" : "text-[#A1A1A1]"}`}>
                    {t.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Balance check for USER_BASE_CHECK */}
        {currentTopic.costPoints && (
          <div
            className={`rounded-xl p-4 ${
              hasEnoughPoints
                ? "bg-[#F8D62E]/10 border border-[#F8D62E]/30"
                : "bg-[#FA6868]/10 border border-[#FA6868]/30"
            }`}
          >
            <p className="text-sm text-[#303030]">
              Стоимость проверки: <b>{currentTopic.costPoints}</b> баллов · Ваш баланс: <b>{displayBalance}</b>
            </p>
            {!hasEnoughPoints && (
              <p className="text-xs text-[#FA6868] mt-1">Недостаточно баллов для этой операции.</p>
            )}
          </div>
        )}

        {/* Message */}
        <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">
            Сообщение <span className="text-[#FA6868]">*</span>
          </label>
          <textarea
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опишите ситуацию максимально подробно..."
            maxLength={5000}
            className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] resize-none transition-colors"
          />
          <div className="text-right text-xs text-[#A1A1A1] mt-1">{message.length} / 5000</div>
        </section>

        {error && (
          <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4">
            <p className="text-sm text-[#FA6868]">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting || !hasEnoughPoints || !message.trim()}>
            {submitting ? "Отправляем..." : "Отправить"}
          </Button>
          <Link href="/support">
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewSupportTicketPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#A1A1A1]">Загрузка...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}
