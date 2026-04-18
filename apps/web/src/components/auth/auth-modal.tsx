"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { setTokens } from "@/lib/auth";

type AuthStep = "phone" | "sms" | "telegram" | "success";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; status: string };
  isNewUser: boolean;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("+7");
  const [phoneError, setPhoneError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [attempts, setAttempts] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [isNewUser, setIsNewUser] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("+7");
      setPhoneError("");
      setGeneralError("");
      setCode(["", "", "", "", "", ""]);
      setAttempts(0);
      setSendingCode(false);
      setVerifying(false);
      setResendSeconds(60);
      setIsNewUser(false);
    }
  }, [open]);

  // Resend timer
  useEffect(() => {
    if (step !== "sms" && step !== "telegram") return;
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendSeconds]);

  if (!open) return null;

  /* ── helpers ──────────────────────────── */

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(1);
    let formatted = "+7";
    if (digits.length > 0) formatted += " (" + digits.slice(0, 3);
    if (digits.length >= 3) formatted += ") " + digits.slice(3, 6);
    if (digits.length >= 6) formatted += "-" + digits.slice(6, 8);
    if (digits.length >= 8) formatted += "-" + digits.slice(8, 10);
    return formatted;
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+7")) {
      setPhone("+7");
      return;
    }
    if (cleaned.replace(/\D/g, "").length > 11) return;
    setPhone(formatPhone(cleaned));
    setPhoneError("");
  };

  const getRawPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return `+${digits}`;
  };

  const handleSubmitPhone = async (method: "SMS" | "TELEGRAM") => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      setPhoneError("Введите корректный номер телефона");
      return;
    }
    setGeneralError("");
    setSendingCode(true);
    try {
      await api("/auth/send-code", {
        method: "POST",
        body: { phone: getRawPhone(), method },
      });
      setResendSeconds(60);
      setAttempts(0);
      setCode(["", "", "", "", "", ""]);
      setStep(method === "SMS" ? "sms" : "telegram");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить код";
      setGeneralError(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const verify = async (fullCode: string) => {
    if (verifying) return;
    setVerifying(true);
    setGeneralError("");
    try {
      // Read ref from URL directly (avoids useSearchParams Suspense boundary issues)
      let refParam: string | undefined;
      if (typeof window !== "undefined") {
        const qs = new URLSearchParams(window.location.search);
        refParam = qs.get("ref") ?? undefined;
      }
      const res = await api<VerifyResponse>("/auth/verify", {
        method: "POST",
        body: {
          phone: getRawPhone(),
          code: fullCode,
          ...(refParam ? { referralCode: refParam } : {}),
        },
      });
      setTokens(res.accessToken, res.refreshToken);
      setIsNewUser(res.isNewUser);
      setStep("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Неверный код";
      setAttempts((a) => a + 1);
      setGeneralError(msg);
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      void verify(next.join(""));
    }
  };

  const handleCodeKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const goNext = () => {
    onClose();
    if (isNewUser) router.push("/profile");
    else router.push("/dashboard");
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

      {generalError && (
        <p className="mt-3 text-sm text-[#FA6868] text-center">{generalError}</p>
      )}

      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => handleSubmitPhone("SMS")}
          disabled={sendingCode}
        >
          {sendingCode ? "Отправка..." : "Подтвердить через SMS"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleSubmitPhone("TELEGRAM")}
          disabled={sendingCode}
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
            disabled={verifying}
            className="w-11 h-14 border border-[#E5E5E5] rounded-lg text-center text-xl font-medium text-[#303030] focus:border-[#303030] outline-none transition-colors disabled:opacity-50"
          />
        ))}
      </div>

      {generalError && (
        <p className="mt-3 text-sm text-[#FA6868] text-center">
          {generalError}
          {attempts > 0 && attempts < 3 && ` (попытка ${attempts} из 3)`}
        </p>
      )}

      <button
        onClick={() => setStep("phone")}
        className="mt-6 block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
      >
        Изменить номер
      </button>

      {resendSeconds > 0 ? (
        <p className="mt-4 text-xs text-[#A1A1A1] text-center">
          Отправить код повторно через {resendSeconds} сек
        </p>
      ) : (
        <button
          onClick={() => handleSubmitPhone("SMS")}
          disabled={sendingCode}
          className="mt-4 block mx-auto text-xs text-[#303030] hover:underline"
        >
          Отправить код повторно
        </button>
      )}
    </>
  );

  const renderTelegram = () => (
    <>
      <h2 className="text-xl font-medium text-[#303030] text-center">Введите код из Telegram</h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">
        Мы отправили код в Telegram на номер {phone}
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
            disabled={verifying}
            className="w-11 h-14 border border-[#E5E5E5] rounded-lg text-center text-xl font-medium text-[#303030] focus:border-[#303030] outline-none transition-colors disabled:opacity-50"
          />
        ))}
      </div>

      {generalError && (
        <p className="mt-3 text-sm text-[#FA6868] text-center">
          {generalError}
          {attempts > 0 && attempts < 3 && ` (попытка ${attempts} из 3)`}
        </p>
      )}

      <button
        onClick={() => setStep("phone")}
        className="mt-6 block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
      >
        Изменить номер
      </button>

      {resendSeconds > 0 ? (
        <p className="mt-4 text-xs text-[#A1A1A1] text-center">
          Отправить код повторно через {resendSeconds} сек
        </p>
      ) : (
        <button
          onClick={() => handleSubmitPhone("TELEGRAM")}
          disabled={sendingCode}
          className="mt-4 block mx-auto text-xs text-[#303030] hover:underline"
        >
          Отправить код повторно
        </button>
      )}
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
        {isNewUser ? "Регистрация прошла успешно!" : "Вход выполнен!"}
      </h2>
      <p className="mt-2 text-sm text-[#A1A1A1] text-center">
        {isNewUser ? "Добро пожаловать в ТаксиБрат" : "Рады вас снова видеть"}
      </p>

      <Button size="lg" className="w-full mt-8" onClick={goNext}>
        {isNewUser ? "Заполнить данные и получить 100 баллов" : "В личный кабинет"}
      </Button>

      {isNewUser && (
        <button
          onClick={() => {
            onClose();
            router.push("/dashboard");
          }}
          className="mt-3 block mx-auto text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors"
        >
          Пропустить
        </button>
      )}
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
