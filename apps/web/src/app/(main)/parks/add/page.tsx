"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────────── */

type UserStatus = "RENT" | "PLAN_RENT" | "REPRESENTATIVE";

const STATUS_OPTIONS: { value: UserStatus; label: string; hint: string }[] = [
  { value: "RENT", label: "Арендую", hint: "Работаю в этом таксопарке сейчас" },
  { value: "PLAN_RENT", label: "Планирую арендовать", hint: "Хочу проверить условия перед подключением" },
  { value: "REPRESENTATIVE", label: "Представитель парка", hint: "Добавляю свой таксопарк на платформу" },
];

const STATUS_LABELS: Record<UserStatus, string> = {
  RENT: "Арендую",
  PLAN_RENT: "Планирую арендовать",
  REPRESENTATIVE: "Представитель парка",
};

/* ── page ─────────────────────────────────────────────── */

export default function AddParkPage() {
  const router = useRouter();
  const [status, setStatus] = useState<UserStatus>("RENT");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

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
      const ticket = await api<{ id: string }>("/tickets", {
        method: "POST",
        token,
        body: {
          topic: "PARK_CHECK",
          body:
            `Добавление таксопарка:\n` +
            `Статус: ${STATUS_LABELS[status]}\n` +
            `Название: ${name}\n` +
            `Адрес: ${address}\n` +
            `Телефон: ${phone}\n\n` +
            (comment || "—"),
        },
      });
      setTicketId(ticket.id);
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
        description="Мы проверим информацию о парке и добавим его в рейтинг. Обычно проверка занимает до 3 рабочих дней."
        ctaLabel={ticketId ? "К тикету" : "На главную"}
        onCta={() => router.push(ticketId ? `/support?ticketId=${ticketId}` : "/")}
        secondaryLabel="К списку"
        onSecondary={() => router.push("/parks")}
      />

      <div className="max-w-[720px] mx-auto px-6 py-8 md:py-12">
        <div className="mb-6">
          <Link href="/parks" className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К рейтингу таксопарков
          </Link>
          <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mt-3">Добавить таксопарк</h1>
          <p className="text-sm text-[#A1A1A1] mt-2">
            Расскажите о своём таксопарке — мы проверим данные и добавим его в рейтинг
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E5E5E5] p-6 md:p-8 space-y-6">
          {/* Status radio */}
          <div>
            <p className="text-sm font-medium text-[#303030] mb-3">Ваш статус</p>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    status === opt.value ? "border-[#303030] bg-[#FAFAFA]" : "border-[#E5E5E5] hover:border-[#A1A1A1]"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    className="mt-1 w-4 h-4 accent-[#F8D62E]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#303030]">{opt.label}</p>
                    <p className="text-xs text-[#A1A1A1] mt-0.5">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Название таксопарка"
            placeholder="Например: Драйв Парк"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Адрес</label>
            <input
              type="text"
              placeholder="Город, улица, дом"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors"
            />
            <p className="text-[10px] text-[#A1A1A1] mt-1">Подсказки адресов появятся после ввода</p>
          </div>

          <Input
            label="Телефон парка"
            placeholder="+7 (___) ___-__-__"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Условия аренды, комиссия, что считаете важным..."
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-lg px-4 py-3">
              <p className="text-sm text-[#FA6868]">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" className="flex-1 sm:flex-none" disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить на проверку"}
            </Button>
            <Link href="/parks">
              <Button type="button" variant="outline">Отмена</Button>
            </Link>
          </div>

          <p className="text-[11px] text-[#A1A1A1] leading-relaxed">
            Отправляя заявку, вы подтверждаете, что указанная информация соответствует действительности.
            Мы оставляем за собой право отклонить заявку при обнаружении недостоверных данных.
          </p>
        </form>
      </div>
    </>
  );
}
