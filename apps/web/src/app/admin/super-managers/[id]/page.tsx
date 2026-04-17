"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* ── types ─────────────────────────────────────────────── */

type Section = "CHAT" | "TAXI_CHECK" | "NO_9_PERCENT" | "USERS" | "BUYOUT";

const SECTION_LABELS: Record<Section, string> = {
  CHAT: "Чат",
  TAXI_CHECK: "Проверки таксопарков",
  NO_9_PERCENT: "Без 9%",
  USERS: "Пользователи",
  BUYOUT: "Выкуп авто",
};

/* ── page ─────────────────────────────────────────────── */

export default function SuperManagerDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [lastName, setLastName] = useState("Петров");
  const [firstName, setFirstName] = useState("Алексей");
  const [patronymic, setPatronymic] = useState("Иванович");
  const [phone, setPhone] = useState("+7 (999) 001-00-01");
  const [email, setEmail] = useState("a.petrov@taxibrat.ru");
  const [sections, setSections] = useState<Section[]>(["CHAT", "TAXI_CHECK", "USERS"]);
  const [workingSections, setWorkingSections] = useState<Section[]>(["CHAT", "TAXI_CHECK"]);
  const [canSeePhones, setCanSeePhones] = useState(true);
  const [canManageManagers, setCanManageManagers] = useState(true);
  const [saved, setSaved] = useState(false);

  const toggleSection = (s: Section) => {
    setSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  };

  const toggleWorking = (s: Section) => {
    setWorkingSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/super-managers" className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          К списку супер-менеджеров
        </Link>
        <h1 className="text-xl font-medium text-[#303030] mt-2">Супер-менеджер #{id}</h1>
      </div>

      {/* Basic info */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Фамилия" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input label="Имя" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Отчество" value={patronymic} onChange={(e) => setPatronymic(e.target.value)} />
          <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Дата создания</label>
            <div className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#A1A1A1] flex items-center">
              02.01.2026
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Курируемые секции</h2>
        <div className="space-y-3">
          {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
            <div key={s} className="flex items-center justify-between gap-4 pb-3 border-b border-[#F3F3F3] last:border-0 last:pb-0">
              <label className="flex items-center gap-2 text-sm text-[#303030] cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={sections.includes(s)}
                  onChange={() => toggleSection(s)}
                  className="w-4 h-4 accent-[#F8D62E]"
                />
                {SECTION_LABELS[s]}
              </label>
              {sections.includes(s) && (
                <label className="flex items-center gap-2 text-xs text-[#A1A1A1] cursor-pointer whitespace-nowrap">
                  <span>Сейчас работает</span>
                  <button
                    type="button"
                    onClick={() => toggleWorking(s)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      workingSections.includes(s) ? "bg-[#F8D62E]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workingSections.includes(s) ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Permissions */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Права доступа</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#303030]">Может видеть телефоны пользователей</p>
              <p className="text-xs text-[#A1A1A1] mt-0.5">Доступ к персональным данным при работе с тикетами</p>
            </div>
            <button
              type="button"
              onClick={() => setCanSeePhones(!canSeePhones)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                canSeePhones ? "bg-[#F8D62E]" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  canSeePhones ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#303030]">Может управлять менеджерами</p>
              <p className="text-xs text-[#A1A1A1] mt-0.5">Создание, редактирование и отключение менеджеров</p>
            </div>
            <button
              type="button"
              onClick={() => setCanManageManagers(!canManageManagers)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                canManageManagers ? "bg-[#F8D62E]" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  canManageManagers ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Статистика</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[#A1A1A1]">Менеджеров</p>
            <p className="text-2xl font-medium text-[#303030] mt-1">5</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Тикетов за месяц</p>
            <p className="text-2xl font-medium text-[#303030] mt-1">132</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Решено</p>
            <p className="text-2xl font-medium text-[#303030] mt-1">124</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Средний ответ</p>
            <p className="text-2xl font-medium text-[#303030] mt-1">3 мин</p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Сохранить</Button>
        <Link href="/admin/super-managers">
          <Button variant="outline">Отмена</Button>
        </Link>
        {saved && <Badge variant="green">Сохранено</Badge>}
      </div>
    </div>
  );
}
