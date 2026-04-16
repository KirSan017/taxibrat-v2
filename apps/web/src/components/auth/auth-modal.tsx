"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthStep = "phone" | "sms" | "telegram" | "success";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("+7");
  const [phoneError, setPhoneError] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("+7");
      setPhoneError("");
      setCode(["", "", "", "", "", ""]);
    }
  }, [open]);

  if (!open) return null;

  /* ── helpers ──────────────────────────── */

  const formatPhone = (raw: string) => {
    // Keep only digits after +7
    const digits = raw.replace(/\D/g, "").slice(1); // remove leading 7
    let formatted = "+7";
    if (digits.length > 0) formatted += " (" + digits.slice(0, 3);
    if (digits.length >= 3) formatted += ") " + digits.slice(3, 6);
    if (digits.length >= 6) formatted += "-" + digits.slice(6, 8);
    if (digits.length >= 8) formatted += "-" + digits.slice(8, 10);
    return formatted;
  };

  const handlePhoneChange = (val: string) => {
    // Only allow digits after +7
    const cleaned = val.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+7")) {
      setPhone("+7");
      return;
    }
    if (cleaned.replace(/\D/g, "").length > 11) return;
    setPhone(formatPhone(cleaned));
    setPhoneError("");
  };

  const handleSubmitPhone = (method: "sms" | "telegram") => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      setPhoneError("Введите корректный номер телефона");
      return;
    }
    setStep(method);
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (next.every((d) => d !== "")) {
      setTimeout(() => setStep("success"), 400);
    }
  };

  const handleCodeKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  /* ── render steps ────────────────────── */

  const renderPhone = () => (
    <>
      <h2 className="text-xl font-medium text-[#303030] text-center">Вход / Регистрация</h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">Введите номер телефона</p>

      <div className="mt-6">
        <Input
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="+7 (999) 123-45-67"
          error={phoneError}
          className="text-center text-lg tracking-wide"
        />
      </div>

      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => handleSubmitPhone("sms")}
        >
          Подтвердить через SMS
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleSubmitPhone("telegram")}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Подтвердить через Telegram
        </Button>
      </div>

      <p className="mt-6 text-[10px] text-[#A1A1A1] text-center leading-relaxed">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <a href="/terms" className="underline">условиями оферты</a> и{" "}
        <a href="/privacy" className="underline">политикой конфиденциальности</a>
      </p>
    </>
  );

  const renderSMS = () => (
    <>
      <h2 className="text-xl font-medium text-[#303030] text-center">Введите код из SMS</h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">
        Код отправлен на номер {phone}
      </p>

      <div className="mt-8 flex justify-center gap-2">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { codeRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeInput(i, e.target.value)}
            onKeyDown={(e) => handleCodeKeyDown(i, e)}
            className="w-11 h-14 border border-[#E5E5E5] rounded-lg text-center text-xl font-medium text-[#303030] focus:border-[#303030] outline-none transition-colors"
          />
        ))}
      </div>

      <button
        onClick={() => setStep("phone")}
        className="mt-6 block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
      >
        Изменить номер
      </button>

      <p className="mt-4 text-xs text-[#A1A1A1] text-center">
        Отправить код повторно через 60 сек
      </p>
    </>
  );

  const renderTelegram = () => (
    <>
      <h2 className="text-xl font-medium text-[#303030] text-center">Подтвердите в Telegram</h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">
        Мы отправили запрос подтверждения в Telegram на номер {phone}
      </p>

      <div className="mt-8 flex justify-center">
        {/* Spinner */}
        <div className="w-16 h-16 border-4 border-[#E5E5E5] border-t-[#303030] rounded-full animate-spin" />
      </div>

      <p className="mt-6 text-sm text-[#A1A1A1] text-center">Ожидание подтверждения...</p>

      <div className="mt-6 space-y-3">
        <Button
          variant="outline"
          size="md"
          className="w-full"
          onClick={() => setStep("success")}
        >
          Я подтвердил
        </Button>
        <button
          onClick={() => setStep("phone")}
          className="block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
        >
          Изменить номер
        </button>
      </div>
    </>
  );

  const renderSuccess = () => (
    <>
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="mt-4 text-xl font-medium text-[#303030] text-center">
        Регистрация прошла успешно!
      </h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">
        Добро пожаловать в ТаксиБрат
      </p>

      <Button
        size="lg"
        className="w-full mt-8"
        onClick={onClose}
      >
        Заполнить данные и получить 100 баллов
      </Button>

      <button
        onClick={onClose}
        className="mt-3 block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
      >
        Пропустить
      </button>
    </>
  );

  const stepContent: Record<AuthStep, () => React.ReactNode> = {
    phone: renderPhone,
    sms: renderSMS,
    telegram: renderTelegram,
    success: renderSuccess,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[420px] mx-4 p-8 animate-in fade-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#A1A1A1" strokeWidth="2">
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>

        {stepContent[step]()}
      </div>
    </div>
  );
}
