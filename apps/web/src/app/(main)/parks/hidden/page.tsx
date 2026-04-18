"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

function HiddenParkContent() {
  const params = useSearchParams();
  const parkName = params?.get("name") ?? "Этот таксопарк";
  const parkId = params?.get("id") ?? null;

  const [fio, setFio] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) {
      setError("Войдите в аккаунт, чтобы отправить заявку");
      return;
    }
    setSubmitting(true);
    try {
      await api("/tickets", {
        method: "POST",
        token,
        body: {
          topic: "TAXI_CONNECT",
          body:
            `Заявка на подключение парка:\n` +
            `Парк: ${parkName}${parkId ? ` (id: ${parkId})` : ""}\n` +
            `ФИО: ${fio}\n` +
            `Телефон: ${phone}`,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SuccessModal
        open={submitted}
        onClose={() => setSubmitted(false)}
        title="Заявка отправлена"
        description="Мы свяжемся с представителем парка и предложим подключиться к платформе. Вы получите уведомление о результате."
        ctaLabel="К рейтингу"
        onCta={() => {
          setSubmitted(false);
          window.location.href = "/parks";
        }}
      />

      <div className="max-w-[720px] mx-auto px-6 py-10 md:py-16">
        <div className="mb-6">
          <Link
            href="/parks"
            className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К рейтингу таксопарков
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 md:p-10 text-center">
          <div className="w-20 h-20 bg-[#F8D62E]/20 rounded-full mx-auto flex items-center justify-center mb-5">
            <svg
              className="w-10 h-10 text-[#303030]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 15v2M6.34 6.34L4.93 4.93M17.66 6.34l1.41-1.41M1 12h2M21 12h2M12 1v2M17.66 17.66l1.41 1.41M6.34 17.66l-1.41 1.41" />
              <circle cx="12" cy="12" r="5" />
            </svg>
          </div>

          <h1 className="text-xl md:text-2xl font-medium text-[#303030] mb-3">
            {parkName} находится в списке парков,
            <br />
            чьи данные скрыты
          </h1>

          <p className="text-sm text-[#A1A1A1] leading-relaxed max-w-md mx-auto mb-6">
            Рейтинг этого таксопарка выше среднего по Москве. По условиям программы
            детальные данные таких парков доступны только пользователям с премиум-доступом
            или партнёрам платформы.
          </p>

          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 text-left mb-6">
            <h2 className="text-sm font-medium text-[#303030] mb-3">
              Что вы получите при подключении парка
            </h2>
            <ul className="space-y-2 text-xs text-[#303030]/80">
              <li className="flex gap-2">
                <span className="text-[#F8D62E]">•</span>
                <span>Открытие данных о парке в рейтинге</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#F8D62E]">•</span>
                <span>Верификация отзывов и защита от фейков</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#F8D62E]">•</span>
                <span>Доступ к заказам «По делам без 9%» для водителей</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#F8D62E]">•</span>
                <span>Приоритетное размещение в выдаче</span>
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-left max-w-md mx-auto">
            <Input label="Ваше ФИО" value={fio} onChange={(e) => setFio(e.target.value)} required />
            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {error && (
              <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-lg px-4 py-2">
                <p className="text-xs text-[#FA6868]">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить заявку на подключение"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function HiddenParkPage() {
  return (
    <Suspense fallback={<div className="max-w-[720px] mx-auto px-6 py-16 text-center text-sm text-[#A1A1A1]">Загрузка...</div>}>
      <HiddenParkContent />
    </Suspense>
  );
}
