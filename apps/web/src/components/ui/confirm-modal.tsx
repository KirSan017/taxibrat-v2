"use client";

import { Button } from "./button";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "warning";
}

export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  onConfirm,
  variant = "default",
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-8 w-full max-w-[440px] mx-4">
        {variant === "warning" && (
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
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        )}
        <h2 className={`text-lg font-medium text-[#303030] mb-2 ${variant === "warning" ? "text-center" : ""}`}>
          {title}
        </h2>
        {description && (
          <p className={`text-sm text-[#A1A1A1] mb-6 leading-relaxed ${variant === "warning" ? "text-center" : ""}`}>
            {description}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 ${variant === "warning" ? "bg-[#FA6868] hover:bg-[#e85050]" : ""}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
