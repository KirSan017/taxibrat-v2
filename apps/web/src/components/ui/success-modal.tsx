"use client";

import { Button } from "./button";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function SuccessModal({
  open,
  onClose,
  title,
  description,
  ctaLabel = "Понятно",
  onCta,
  secondaryLabel,
  onSecondary,
}: SuccessModalProps) {
  if (!open) return null;

  const handleCta = () => {
    if (onCta) onCta();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-8 w-full max-w-[440px] mx-4 text-center">
        <div className="w-16 h-16 bg-[#F8D62E] rounded-full mx-auto flex items-center justify-center mb-5">
          <svg
            className="w-8 h-8 text-[#303030]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-[#303030] mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-[#A1A1A1] mb-6 leading-relaxed">{description}</p>
        )}
        <div className="flex gap-3">
          {secondaryLabel && (
            <Button variant="outline" className="flex-1" onClick={onSecondary ?? onClose}>
              {secondaryLabel}
            </Button>
          )}
          <Button className="flex-1" onClick={handleCta}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
