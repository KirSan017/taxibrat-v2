"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── topics ───────────────────────────────────────────── */

interface Topic {
  key: string;
  label: string;
  titleTemplate: string;
}

const TOPICS: Topic[] = [
  { key: "PARK_CHECK", label: "Проверка таксопарка", titleTemplate: "Проверка таксопарка" },
  { key: "NO9_ORDER", label: "Заказ «По делам, без 9%»", titleTemplate: "Заказ «По делам»" },
  { key: "BUYOUT", label: "Выкуп авто", titleTemplate: "Вопрос по выкупу авто" },
  { key: "POINTS", label: "Баллы дружбы", titleTemplate: "Вопрос по баллам дружбы" },
  { key: "PROFILE", label: "Изменение данных профиля", titleTemplate: "Изменение данных профиля" },
  { key: "COMPLAINT", label: "Жалоба на водителя/парк", titleTemplate: "Жалоба" },
  { key: "USER_BASE_CHECK", label: "Проверка по базе таксопарков", titleTemplate: "Проверка пользователя по базе" },
  { key: "OTHER", label: "Другое", titleTemplate: "Обращение в техподдержку" },
];

/* ── form content ─────────────────────────────────────── */

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const [topicKey, setTopicKey] = useState<string>(() => {
    const match = TOPICS.find((t) => t.key === topicParam);
    return match ? match.key : TOPICS[0].key;
  });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const currentTopic = TOPICS.find((t) => t.key === topicKey) ?? TOPICS[0];

  // auto-generate title when topic changes (if user hasn't manually edited)
  const [titleTouched, setTitleTouched] = useState(false);
  useEffect(() => {
    if (!titleTouched) {
      setTitle(currentTopic.titleTemplate);
    }
  }, [currentTopic, titleTouched]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Mock: pretend we create a ticket and get id "new"
    setTimeout(() => {
      router.push("/support/new-ticket");
    }, 400);
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
                onClick={() => {
                  setTopicKey(t.key);
                  setTitleTouched(false);
                }}
                className={`text-left px-4 py-3 rounded-lg text-sm border transition-colors ${
                  topicKey === t.key
                    ? "bg-[#303030] text-white border-[#303030]"
                    : "bg-white text-[#303030] border-[#E5E5E5] hover:border-[#303030]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Title */}
        <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <Input
            label="Заголовок"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
            }}
            required
            maxLength={120}
          />
        </section>

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
            className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] resize-none transition-colors"
          />
        </section>

        {/* Attachments */}
        <section className="bg-white rounded-xl border border-[#E5E5E5] p-5 md:p-6">
          <h2 className="text-sm font-medium text-[#303030] mb-1">Вложения</h2>
          <p className="text-xs text-[#A1A1A1] mb-4">До 5 файлов (PDF, JPG, PNG).</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((f, i) => (
              <div
                key={i}
                className="relative border border-[#E5E5E5] rounded-lg p-3 bg-gray-50 group"
              >
                <p className="text-xs text-[#303030] truncate">{f.name}</p>
                <p className="text-[10px] text-[#A1A1A1]">
                  {(f.size / 1024).toFixed(1)} КБ
                </p>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {files.length < 5 && (
              <label className="border-2 border-dashed border-[#E5E5E5] rounded-lg p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#303030] transition-colors min-h-[72px]">
                <svg className="w-5 h-5 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-[10px] text-[#A1A1A1]">Добавить файл</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
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
