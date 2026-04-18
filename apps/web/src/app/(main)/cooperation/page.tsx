"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

/* ── component ──────────────────────────────────────────── */

export default function CooperationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api<{ success: boolean }>("/cooperation", {
        method: "POST",
        body: { name, email, phone, message },
      });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
            Сотрудничество
          </h1>
          <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
            Хотите стать партнёром ТаксиБрат? Заполните форму, и мы свяжемся с вами для обсуждения условий.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        <div className="max-w-xl">
          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-[#303030] mb-2">Заявка отправлена!</h2>
              <p className="text-sm text-[#A1A1A1] mb-6">Мы свяжемся с вами в ближайшее время для обсуждения деталей.</p>
              <Button variant="outline" onClick={() => { setSent(false); setName(""); setEmail(""); setPhone(""); setMessage(""); }}>
                Отправить ещё
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-[#E5E5E5] rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-medium text-[#303030] mb-6">Заполните форму</h2>

              <div className="space-y-4 mb-6">
                <Input
                  label="Имя"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Телефон"
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#303030] mb-1.5">Сообщение</label>
                  <textarea
                    placeholder="Расскажите о вашем предложении"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#FA6868] mb-3">{error}</p>
              )}
              <Button size="lg" className="w-full" type="submit" disabled={submitting}>
                {submitting ? "Отправка..." : "Отправить"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
