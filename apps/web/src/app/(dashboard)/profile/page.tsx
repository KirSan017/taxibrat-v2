"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── constants ─────────────────────────────────────────── */

const CAR_CLASSES = ["Эконом", "Комфорт", "Комфорт+", "Бизнес", "Премьер", "Элит"];

const CITIES = [
  "Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск",
  "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
];

const CAR_BRANDS = [
  "Audi", "BMW", "Chery", "Chevrolet", "Ford", "Geely", "Genesis",
  "Haval", "Honda", "Hyundai", "Kia", "Lada", "Mazda", "Mercedes-Benz",
  "Mitsubishi", "Nissan", "Opel", "Peugeot", "Renault", "Skoda",
  "Toyota", "Volkswagen", "Volvo",
];

const CAR_MODELS: Record<string, string[]> = {
  Hyundai: ["Solaris", "Creta", "Tucson", "Santa Fe", "Sonata"],
  Kia: ["Rio", "Ceed", "K5", "Sportage", "Sorento"],
  Toyota: ["Camry", "Corolla", "RAV4", "Land Cruiser"],
  Volkswagen: ["Polo", "Tiguan", "Passat", "Jetta"],
  Skoda: ["Octavia", "Rapid", "Kodiaq", "Superb"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  "Mercedes-Benz": ["E-Class", "S-Class", "C-Class", "GLC"],
};

/* ── types ─────────────────────────────────────────── */

interface ProfileForm {
  lastName: string;
  firstName: string;
  patronymic: string;
  email: string;
  birthDate: string;
  city: string;
  carYear: string;
  carNumber: string;
  carBrand: string;
  carModel: string;
  carClass: string;
}

const EMPTY_FORM: ProfileForm = {
  lastName: "",
  firstName: "",
  patronymic: "",
  email: "",
  birthDate: "",
  city: "",
  carYear: "",
  carNumber: "",
  carBrand: "",
  carModel: "",
  carClass: "",
};

/* ── component ─────────────────────────────────────────── */

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isFirstTime = user?.status === "PHONE_VERIFIED";

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", message: "Фото не более 2 МБ" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setUploadingPhoto(true);
      try {
        await api("/users/me/photo", {
          method: "POST",
          token,
          body: { photoBase64: dataUrl },
        });
        setToast({ type: "success", message: "Фото обновлено" });
        setTimeout(() => setToast(null), 2500);
      } catch (err: unknown) {
        setToast({
          type: "error",
          message: err instanceof Error ? err.message : "Не удалось загрузить фото",
        });
        setTimeout(() => setToast(null), 3000);
        setPhotoPreview(null);
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhoneChangeClick = () => {
    alert("Смена номера телефона — функция в разработке. Обратитесь в поддержку.");
  };

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{
      firstName: string | null;
      lastName: string | null;
      patronymic: string | null;
      email: string | null;
      birthDate: string | null;
    }>("/users/me", { token })
      .then((me) => {
        setForm({
          ...EMPTY_FORM,
          firstName: me.firstName || "",
          lastName: me.lastName || "",
          patronymic: me.patronymic || "",
          email: me.email || "",
          birthDate: me.birthDate || "",
        });
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoading(false));
  }, [user]);

  const update = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName || !form.firstName || !form.birthDate) {
      setToast({ type: "error", message: "Заполните обязательные поля" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
      };
      if (form.patronymic) payload.patronymic = form.patronymic;
      if (form.email) payload.email = form.email;

      await api("/users/me", {
        method: "PATCH",
        token,
        body: payload,
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Не удалось сохранить профиль",
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const availableModels = CAR_MODELS[form.carBrand] || [];

  if (loading) {
    return <div className="max-w-[700px] text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  return (
    <div className="max-w-[700px] relative">
      <SuccessModal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
        title={isFirstTime ? "Профиль отправлен на проверку" : "Профиль обновлён"}
        description={isFirstTime ? "После подтверждения вы получите 100 баллов дружбы." : "Ваши данные успешно сохранены."}
      />

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
          <div className="w-14 h-14 bg-[#E5E5E5] rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {photoPreview || user?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(photoPreview || user?.photoUrl) as string}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-7 h-7 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <label className="text-sm text-[#A1A1A1] cursor-pointer hover:text-[#303030] transition-colors">
            {uploadingPhoto ? "Загрузка..." : "Ваше фото"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
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
            value={form.patronymic}
            onChange={(e) => update("patronymic", e.target.value)}
          />
        </div>

        {/* Phone (readonly + change button) */}
        <div className="relative">
          <Input
            label="Телефон"
            value={user?.phone || ""}
            readOnly
            className="bg-gray-50 pr-10"
          />
          <button
            type="button"
            onClick={handlePhoneChangeClick}
            className="absolute right-3 top-[30px] w-7 h-7 text-[#A1A1A1] hover:text-[#303030] transition-colors"
            title="Изменить телефон"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
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

        {/* City */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Город</label>
          <select
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="">Выберите город</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

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
                <input type="file" accept="image/*" capture="environment" className="hidden" />
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
              <input type="file" accept="image/*" capture="environment" className="hidden" />
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

        {/* Car year */}
        <Input
          label="Год автомобиля"
          placeholder="2023"
          type="number"
          value={form.carYear}
          onChange={(e) => update("carYear", e.target.value)}
        />

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
          disabled={submitting}
          className="w-full !bg-[#F8D62E] !text-[#303030] hover:!bg-[#F8D62E]/80 !h-[56px] !text-base !font-medium"
        >
          {submitting ? "Сохранение..." :
            isFirstTime
              ? "Отправить на проверку и получить 100 баллов"
              : "Сохранить"}
        </Button>
      </form>
    </div>
  );
}
