"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ───────────────────────────────────────────── */

interface MyLinkResponse {
  referralCode: string;
  link: string;
}

interface Friend {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
}

interface FriendsResponse {
  data: Friend[];
  total: number;
}

interface StatsResponse {
  totalInvited: number;
  totalPointsEarned: number;
}

const FRIEND_STATUS: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  PHONE_VERIFIED: { label: "Не активен", variant: "gray" },
  PENDING_REVIEW: { label: "На проверке", variant: "yellow" },
  ACTIVE: { label: "Активен", variant: "green" },
  REJECTED: { label: "Отклонён", variant: "red" },
  BANNED: { label: "Заблокирован", variant: "red" },
};

/* ── component ─────────────────────────────────────── */

export default function ReferralsPage() {
  const { user } = useAuth();
  const [myLink, setMyLink] = useState<MyLinkResponse | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<MyLinkResponse>("/referrals/my-link", { token }),
      api<FriendsResponse>("/referrals/friends?page=1&limit=50", { token }),
      api<StatsResponse>("/referrals/stats", { token }),
    ])
      .then(([link, fr, st]) => {
        setMyLink(link);
        setFriends(fr.data || []);
        setStats(st);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleCopy = async () => {
    if (!myLink?.link) return;
    try {
      await navigator.clipboard.writeText(myLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = myLink.link;
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
          Поделитесь ссылкой с друзьями и получите бонусные баллы
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#303030] truncate border border-[#F8D62E]/50">
            {loading ? "Загрузка..." : myLink?.link || "—"}
          </div>
          <Button
            size="sm"
            className="shrink-0 !bg-[#303030] !text-white"
            onClick={handleCopy}
            disabled={!myLink?.link}
          >
            {copied ? "Скопировано!" : "Копировать"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-[#E5E5E5] rounded-xl p-5 text-center">
          <p className="text-3xl font-medium text-[#303030]">{stats?.totalInvited ?? 0}</p>
          <p className="text-xs text-[#A1A1A1] mt-1">Приглашено друзей</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-xl p-5 text-center">
          <p className="text-3xl font-medium text-[#F8D62E]">{stats?.totalPointsEarned ?? 0}</p>
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
            { step: "3", text: "Вы получаете бонус, друг — 100 баллов" },
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
        {loading ? (
          <p className="text-sm text-[#A1A1A1] text-center py-8">Загрузка...</p>
        ) : friends.length === 0 ? (
          <div className="text-center py-12 border border-[#E5E5E5] rounded-xl">
            <p className="text-sm text-[#A1A1A1]">Вы пока никого не пригласили</p>
            <p className="text-xs text-[#A1A1A1] mt-1">Поделитесь ссылкой и начните зарабатывать баллы!</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden">
            {friends.map((friend) => {
              const name = [friend.firstName, friend.lastName].filter(Boolean).join(" ") || "Пользователь";
              const status = FRIEND_STATUS[friend.status] || { label: friend.status, variant: "gray" as const };
              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between px-4 py-3.5 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-[#E5E5E5] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-[#A1A1A1]">
                        {name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#303030] truncate">{name}</p>
                      <p className="text-[10px] text-[#A1A1A1]">
                        {new Date(friend.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
