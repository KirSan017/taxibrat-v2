"use client";

import { Button } from "./button";

interface CancelOrderModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  balance: number;
  cost?: number;
  title?: string;
  description?: string;
}

export function CancelOrderModal({
  open,
  onClose,
  onConfirm,
  balance,
  cost = 15,
  title = "Отменить заказ?",
  description = "При отмене заказа со счёта будет списано 15 баллов дружбы.",
}: CancelOrderModalProps) {
  if (!open) return null;

  const insufficient = balance < cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 md:p-8 w-full max-w-[440px]">
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
        <h2 className="text-lg font-medium text-[#303030] mb-2 text-center">{title}</h2>
        <p className="text-sm text-[#A1A1A1] mb-5 leading-relaxed text-center">{description}</p>

        {/* Balance info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A1A1A1]">Списание</span>
            <span className="font-medium text-[#FA6868]">&minus;{cost} баллов</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A1A1A1]">Ваш баланс</span>
            <span className="font-medium text-[#303030]">{balance} баллов</span>
          </div>
          <div className="h-px bg-[#E5E5E5]" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#303030]">После отмены</span>
            <span className={`font-medium ${insufficient ? "text-[#FA6868]" : "text-[#303030]"}`}>
              {balance - cost} баллов
            </span>
          </div>
        </div>

        {insufficient && (
          <p className="text-xs text-[#FA6868] mb-4 text-center">
            Недостаточно баллов для отмены заказа.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Не отменять
          </Button>
          <Button
            disabled={insufficient}
            className="flex-1 bg-[#FA6868] hover:bg-[#e85050]"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Отменить заказ
          </Button>
        </div>
      </div>
    </div>
  );
}
