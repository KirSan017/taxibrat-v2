"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ── mock data ─────────────────────────────────────────── */

const CAR_CLASSES = ["Эконом", "Комфорт", "Комфорт+", "Бизнес", "Премьер", "Элит"];

const CAR_BRANDS = [
  "Audi", "BMW", "Chery", "Chevrolet", "Ford", "Geely", "Genesis",
  "Haval", "Honda", "Hyundai", "Kia", "Lada", "Mazda", "Mercedes-Benz",
  "Mitsubishi", "Nissan", "Opel", "Peugeot", "Renault", "Skoda",
  "Toyota", "Volkswagen", "Volvo",
];

const CAR_MODELS: Record<string, string[]> = {
  "Hyundai": ["Solaris", "Creta", "Tucson", "Santa Fe", "Sonata"],
  "Kia": ["Rio", "Ceed", "K5", "Sportage", "Sorento"],
  "Toyota": ["Camry", "Corolla", "RAV4", "Land Cruiser"],
  "Volkswagen": ["Polo", "Tiguan", "Passat", "Jetta"],
  "Skoda": ["Octavia", "Rapid", "Kodiaq", "Superb"],
  "BMW": ["3 Series", "5 Series", "X3", "X5"],
  "Mercedes-Benz": ["E-Class", "S-Class", "C-Class", "GLC"],
};

const INITIAL_FORM = {
  lastName: "",
  firstName: "",
  middleName: "",
  phone: "8 800 000 00 00",
  email: "",
  birthDate: "",
  workStartDate: "26.02.25",
  carNumber: "",
  carBrand: "",
  carModel: "",
  carClass: "",
};

/* ── component ─────────────────────────────────────────── */

export default function ProfilePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isFirstTime] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName || !form.firstName || !form.birthDate) {
      setToast({ type: "error", message: "Не получилось обновить. Проверьте поля" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast({ type: "success", message: "Успешно обновлено" });
    setTimeout(() => setToast(null), 3000);
  };

  const availableModels = CAR_MODELS[form.carBrand] || [];

  return (
    <div className="max-w-[700px] relative">
      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-[#FA6868]/10 text-[#FA6868] border border-[#FA6868]/30"
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mb-8">
        Изменить профиль
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo upload */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-[#E5E5E5] rounded-full flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <label className="text-sm text-[#A1A1A1] cursor-pointer hover:text-[#303030] transition-colors">
            Ваше фото
            <input type="file" accept="image/*" className="hidden" />
          </label>
        </div>

        {/* Name fields row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Фамилия*"
            placeholder="Фамилия*"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
          <Input
            label="Имя*"
            placeholder="Имя*"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
          <Input
            label="Отчество"
            placeholder="Отчество"
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>

        {/* Phone (readonly) */}
        <div className="relative">
          <Input
            label="Телефон"
            value={form.phone}
            readOnly
            className="bg-gray-50 pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-[#A1A1A1] hover:text-[#303030] transition-colors"
            title="Изменить номер"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* Email */}
        <Input
          label="Email для уведомлений"
          type="email"
          placeholder="Email для уведомлений"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />

        {/* Birth date */}
        <Input
          label="Дата рождения*"
          placeholder="Дата рождения"
          type="date"
          value={form.birthDate}
          onChange={(e) => update("birthDate", e.target.value)}
        />

        {/* Work start date */}
        <Input
          label="Год и месяц начала работы в такси*"
          placeholder="ДД.ММ.ГГ"
          value={form.workStartDate}
          onChange={(e) => update("workStartDate", e.target.value)}
        />

        {/* Document photos */}
        <div>
          <p className="text-sm font-medium text-[#303030] mb-3">Документы</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "Сделать фото\nВодительских прав (лицевая) *",
              "Сделать фото\nВодительских прав (оборотная)",
              "Сделать фото\nЛица с правами *",
            ].map((label, i) => (
              <label
                key={i}
                className="border border-dashed border-[#E5E5E5] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#A1A1A1] transition-colors min-h-[100px]"
              >
                <svg className="w-6 h-6 text-[#A1A1A1] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-[10px] text-[#A1A1A1] whitespace-pre-line leading-tight">{label}</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            ))}
          </div>
        </div>

        {/* STS photos */}
        <div className="grid grid-cols-2 gap-3">
          {[
            "Загрузить фото\nСТС (лицевая)",
            "Загрузить фото\nСТС (оборотная)",
          ].map((label, i) => (
            <label
              key={i}
              className="border border-dashed border-[#E5E5E5] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#A1A1A1] transition-colors min-h-[80px]"
            >
              <svg className="w-6 h-6 text-[#A1A1A1] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-[10px] text-[#A1A1A1] whitespace-pre-line leading-tight">{label}</span>
              <input type="file" accept="image/*" className="hidden" />
            </label>
          ))}
        </div>

        {/* Car number */}
        <Input
          label="Гос номер авто"
          placeholder="А123АА 777"
          value={form.carNumber}
          onChange={(e) => update("carNumber", e.target.value)}
        />

        {/* Car brand select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Марка авто</label>
          <select
            value={form.carBrand}
            onChange={(e) => {
              update("carBrand", e.target.value);
              update("carModel", "");
            }}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="">Марка авто</option>
            {CAR_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Car model select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Модель авто</label>
          <select
            value={form.carModel}
            onChange={(e) => update("carModel", e.target.value)}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
            disabled={!form.carBrand}
          >
            <option value="">Модель авто</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Car class select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Класс авто</label>
          <select
            value={form.carClass}
            onChange={(e) => update("carClass", e.target.value)}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="">Класс авто</option>
            {CAR_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full !bg-[#F8D62E] !text-[#303030] hover:!bg-[#F8D62E]/80 !h-[56px] !text-base !font-medium"
        >
          {isFirstTime
            ? "Отправить на проверку и получить 100 баллов дружбы"
            : "Сохранить"}
        </Button>
      </form>
    </div>
  );
}
