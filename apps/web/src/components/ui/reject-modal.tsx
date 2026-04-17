"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  placeholder?: string;
  maxLength?: number;
  onConfirm: (reason: string) => void;
}

export function RejectModal({
  open,
  onClose,
  title = "Отклонить",
  description = "Укажите причину отклонения. Пользователь увидит это сообщение.",
  placeholder = "Опишите причину...",
  maxLength = 500,
  onConfirm,
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Введите причину отклонения");
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 md:p-8 w-full max-w-[480px]">
        <div className="w-12 h-12 bg-[#FA6868]/10 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-[#FA6868]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-[#303030] mb-2 text-center">{title}</h2>
        {description && (
          <p className="text-sm text-[#A1A1A1] mb-5 leading-relaxed text-center">{description}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-[#303030] mb-1.5">
            Причина <span className="text-[#FA6868]">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            className={`w-full px-4 py-3 border rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none resize-none transition-colors ${
              error ? "border-[#FA6868]" : "border-[#E5E5E5] focus:border-[#303030]"
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            {error ? (
              <p className="text-[10px] text-[#FA6868]">{error}</p>
            ) : (
              <span />
            )}
            <p className="text-[10px] text-[#A1A1A1]">
              {reason.length} / {maxLength}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="flex-1 bg-[#FA6868] hover:bg-[#e85050]"
            onClick={submit}
          >
            Отклонить
          </Button>
        </div>
      </div>
    </div>
  );
}
