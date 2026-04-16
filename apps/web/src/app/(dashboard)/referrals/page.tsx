"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── mock data ─────────────────────────────────────────── */

const MOCK_REFERRAL = {
  link: "https://taxibrat.ru/ref/ivan-abc123",
  invitedCount: 4,
  earnedPoints: 1200,
};

const MOCK_FRIENDS = [
  { id: 1, name: "Сергей К.", status: "ACTIVE" as const, date: "10.04.2025", points: 300 },
  { id: 2, name: "Алексей М.", status: "ACTIVE" as const, date: "03.04.2025", points: 300 },
  { id: 3, name: "Дмитрий В.", status: "PENDING" as const, date: "28.03.2025", points: 0 },
  { id: 4, name: "Михаил Н.", status: "ACTIVE" as const, date: "15.03.2025", points: 300 },
];

const FRIEND_STATUS = {
  ACTIVE: { label: "Активен", variant: "green" as const },
  PENDING: { label: "На проверке", variant: "yellow" as const },
  INACTIVE: { label: "Не активен", variant: "gray" as const },
};

/* ── component ─────────────────────────────────────────── */

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_REFERRAL.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = MOCK_REFERRAL.link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-[700px]">
      <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mb-8">
        Приглашение друзей
      </h1>

      {/* Referral link card */}
      <div className="bg-[#F8D62E] rounded-2xl p-6 md:p-8 mb-6">
        <h2 className="text-sm font-medium text-[#303030] mb-1">Ваша реферальная ссылка</h2>
        <p className="text-xs text-[#303030]/60 mb-4">
          Поделитесь ссылкой с друзьями и получите 300 баллов за каждого
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#303030] truncate border border-[#F8D62E]/50">
            {MOCK_REFERRAL.link}
          </div>
          <Button
            size="sm"
            className="shrink-0 !bg-[#303030] !text-white"
            onClick={handleCopy}
          >
            {copied ? "Скопировано!" : "Копировать"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-[#E5E5E5] rounded-xl p-5 text-center">
          <p className="text-3xl font-medium text-[#303030]">{MOCK_REFERRAL.invitedCount}</p>
          <p className="text-xs text-[#A1A1A1] mt-1">Приглашено друзей</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-xl p-5 text-center">
          <p className="text-3xl font-medium text-[#F8D62E]">{MOCK_REFERRAL.earnedPoints}</p>
          <p className="text-xs text-[#A1A1A1] mt-1">Заработано баллов</p>
        </div>
      </div>

      {/* How it works */}
      <div className="border border-[#E5E5E5] rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-medium text-[#303030] mb-4">Как это работает?</h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Поделитесь реферальной ссылкой с другом" },
            { step: "2", text: "Друг регистрируется и заполняет профиль" },
            { step: "3", text: "Вы получаете 300 баллов, друг — 100 баллов" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#F8D62E] rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-[#303030]">
                {item.step}
              </span>
              <p className="text-sm text-[#303030] pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Friends list */}
      <div>
        <h2 className="text-lg font-medium text-[#303030] mb-4">Приглашённые друзья</h2>
        {MOCK_FRIENDS.length === 0 ? (
          <div className="text-center py-12 border border-[#E5E5E5] rounded-xl">
            <p className="text-sm text-[#A1A1A1]">Вы пока никого не пригласили</p>
            <p className="text-xs text-[#A1A1A1] mt-1">Поделитесь ссылкой и начните зарабатывать баллы!</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden">
            {MOCK_FRIENDS.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between px-4 py-3.5 bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#E5E5E5] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-[#A1A1A1]">
                      {friend.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#303030] truncate">{friend.name}</p>
                    <p className="text-[10px] text-[#A1A1A1]">{friend.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={FRIEND_STATUS[friend.status].variant}>
                    {FRIEND_STATUS[friend.status].label}
                  </Badge>
                  {friend.points > 0 && (
                    <span className="text-xs font-medium text-green-600">+{friend.points}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
