"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── component ──────────────────────────────────────────── */

type FormState = "idle" | "not-logged" | "incomplete-profile" | "success";

export default function No9Page() {
  const [pointA, setPointA] = useState("");
  const [pointB, setPointB] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  // Mock: simulate different states. In production this checks auth context.
  const isLoggedIn = true;
  const isProfileComplete = true;

  const handleSubmit = () => {
    if (!isLoggedIn) {
      setFormState("not-logged");
      return;
    }
    if (!isProfileComplete) {
      setFormState("incomplete-profile");
      return;
    }
    setFormState("success");
  };

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
            По делам, без 9%
          </h1>
          <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
            Закажите поездку напрямую у водителя без комиссии агрегатора. Оплата баллами дружбы — экономьте на каждой поездке.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        <div className="max-w-xl">
          {formState === "success" ? (
            /* ══════ SUCCESS STATE ══════ */
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-[#303030] mb-2">Заказ отправлен!</h2>
              <p className="text-sm text-[#A1A1A1] mb-6">Ожидайте, водитель свяжется с вами в ближайшее время.</p>
              <Button variant="outline" onClick={() => { setFormState("idle"); setPointA(""); setPointB(""); }}>
                Новый заказ
              </Button>
            </div>
          ) : (
            /* ══════ ORDER FORM ══════ */
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-medium text-[#303030] mb-6">Оформить заказ</h2>

              <div className="space-y-4 mb-6">
                <Input
                  label="Точка А"
                  placeholder="Откуда забрать (адрес)"
                  value={pointA}
                  onChange={(e) => setPointA(e.target.value)}
                />
                <Input
                  label="Точка Б"
                  placeholder="Куда ехать (адрес)"
                  value={pointB}
                  onChange={(e) => setPointB(e.target.value)}
                />
              </div>

              <div className="bg-[#F3F1E7] rounded-xl p-4 mb-6">
                <p className="text-sm text-[#303030]">
                  Стоимость: <span className="font-medium">50 баллов дружбы</span>
                </p>
              </div>

              {formState === "not-logged" && (
                <div className="bg-[#FA6868]/10 border border-[#FA6868]/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#FA6868]">Войдите, чтобы заказать поездку</p>
                </div>
              )}

              {formState === "incomplete-profile" && (
                <div className="bg-[#F8D62E]/20 border border-[#F8D62E]/40 rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#303030]">Заполните профиль для оформления заказа</p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!pointA.trim() || !pointB.trim()}
                onClick={handleSubmit}
              >
                Заказать
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
