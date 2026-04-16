"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── mock settings ────────────────────────────────────── */

interface PointsSetting {
  key: string;
  label: string;
  value: number;
  description: string;
}

const INITIAL_POINTS: PointsSetting[] = [
  { key: "points_check_complete", label: "Завершение проверки", value: 50, description: "Баллы за завершённую проверку таксопарка" },
  { key: "points_referral", label: "Приглашение друга", value: 100, description: "Баллы за каждого зарегистрированного друга" },
  { key: "points_review", label: "Отзыв на парк", value: 30, description: "Баллы за оставленный отзыв" },
  { key: "points_idea_approved", label: "Одобренная идея", value: 200, description: "Баллы за принятую идею улучшения" },
  { key: "points_order_complete", label: "Заказ «По делам»", value: 25, description: "Баллы за выполненный заказ" },
  { key: "points_daily_login", label: "Ежедневный вход", value: 5, description: "Баллы за ежедневное посещение" },
  { key: "points_profile_complete", label: "Заполнение профиля", value: 50, description: "Баллы за полностью заполненный профиль" },
  { key: "points_first_check", label: "Первая проверка", value: 150, description: "Бонус за первую проверку таксопарка" },
];

/* ── page ─────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [no9Enabled, setNo9Enabled] = useState(true);
  const [bannerUrl, setBannerUrl] = useState("https://example.com/banner.jpg");
  const [pointsReviewEnabled, setPointsReviewEnabled] = useState(false);
  const [pointsReviewDate, setPointsReviewDate] = useState("2026-05-01");
  const [saved, setSaved] = useState(false);

  const updatePoints = (key: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) && value !== "") return;
    setPoints((prev) =>
      prev.map((p) => (p.key === key ? { ...p, value: value === "" ? 0 : num } : p))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-[800px]">
      <h1 className="text-xl font-medium text-[#303030] mb-6">Настройки сервиса</h1>

      {/* Points configuration */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-base font-medium text-[#303030] mb-4">Баллы дружбы</h2>
        <div className="space-y-4">
          {points.map((setting) => (
            <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#303030]">{setting.label}</p>
                <p className="text-xs text-[#A1A1A1]">{setting.description}</p>
              </div>
              <div className="w-full sm:w-[120px] shrink-0">
                <input
                  type="number"
                  value={setting.value}
                  onChange={(e) => updatePoints(setting.key, e.target.value)}
                  className="w-full h-[38px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] text-right outline-none focus:border-[#303030] transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature toggles */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-base font-medium text-[#303030] mb-4">Функции</h2>
        <div className="space-y-4">
          {/* no9_enabled */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#303030]">«По делам, без 9%»</p>
              <p className="text-xs text-[#A1A1A1]">Включить/выключить сервис заказов</p>
            </div>
            <button
              onClick={() => setNo9Enabled(!no9Enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                no9Enabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  no9Enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Points review */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#303030]">Ревизия баллов</p>
              <p className="text-xs text-[#A1A1A1]">Пересмотр начислений баллов</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={pointsReviewDate}
                onChange={(e) => setPointsReviewDate(e.target.value)}
                disabled={!pointsReviewEnabled}
                className="h-[38px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => setPointsReviewEnabled(!pointsReviewEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  pointsReviewEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    pointsReviewEnabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Banner URL */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-base font-medium text-[#303030] mb-4">Баннер</h2>
        <Input
          label="URL баннера"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://..."
        />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Сохранить настройки</Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Сохранено!</span>
        )}
      </div>
    </div>
  );
}
