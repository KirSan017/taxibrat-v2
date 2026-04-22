"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { CameraCapture } from "@/components/ui/camera-capture";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── constants ─────────────────────────────────────────── */

const CAR_CLASS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ECONOMY", label: "Эконом" },
  { value: "COMFORT", label: "Комфорт" },
  { value: "COMFORT_PLUS", label: "Комфорт+" },
  { value: "BUSINESS", label: "Бизнес" },
  { value: "PREMIER", label: "Премьер" },
  { value: "ELITE", label: "Элит" },
];

const CITIES = [
  "Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск",
  "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
];

/* ── types ─────────────────────────────────────────── */

interface ApiBrand { id: string; name: string }
interface ApiModel { id: string; name: string; brandId: string }

interface ProfileForm {
  lastName: string;
  firstName: string;
  patronymic: string;
  email: string;
  birthDate: string;
  city: string;
  carYear: string;
  carPlate: string;
  carBrandId: string;
  carModelId: string;
  carClass: string;
}

type DocumentType = "licenseFront" | "licenseBack" | "faceWithLicense" | "stsFront" | "stsBack";

const EMPTY_FORM: ProfileForm = {
  lastName: "",
  firstName: "",
  patronymic: "",
  email: "",
  birthDate: "",
  city: "",
  carYear: "",
  carPlate: "",
  carBrandId: "",
  carModelId: "",
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
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiModel[]>([]);
  const [docs, setDocs] = useState<Record<DocumentType, string | null>>({
    licenseFront: null,
    licenseBack: null,
    faceWithLicense: null,
    stsFront: null,
    stsBack: null,
  });
  const [uploadingDoc, setUploadingDoc] = useState<DocumentType | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [cameraTarget, setCameraTarget] = useState<DocumentType | "photo" | null>(null);

  const isFirstTime = user?.status === "PHONE_VERIFIED";

  const uploadDocumentBase64 = async (documentType: DocumentType, dataUrl: string) => {
    // dataUrl is ~1.33x the raw bytes. 4MB raw ≈ ~5.3MB base64.
    if (dataUrl.length > 6 * 1024 * 1024) {
      setToast({ type: "error", message: "Файл не более 4 МБ" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setDocs((prev) => ({ ...prev, [documentType]: dataUrl }));
    setUploadingDoc(documentType);
    try {
      await api("/users/me/document", {
        method: "POST",
        token,
        body: { documentType, base64: dataUrl },
      });
      setToast({ type: "success", message: "Документ загружен" });
      setTimeout(() => setToast(null), 2500);
    } catch (err: unknown) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Не удалось загрузить документ",
      });
      setTimeout(() => setToast(null), 3000);
      setDocs((prev) => ({ ...prev, [documentType]: null }));
    } finally {
      setUploadingDoc(null);
    }
  };

  const uploadPhotoBase64 = async (dataUrl: string) => {
    if (dataUrl.length > 3 * 1024 * 1024) {
      setToast({ type: "error", message: "Фото не более 2 МБ" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
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

  // Phone change flow
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"enter" | "code">("enter");
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneMethod, setPhoneMethod] = useState<"SMS" | "TELEGRAM">("SMS");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChangeClick = () => {
    setNewPhone("");
    setPhoneCode("");
    setPhoneError("");
    setPhoneStep("enter");
    setPhoneModalOpen(true);
  };

  const handleSendPhoneCode = async () => {
    const token = getAccessToken();
    if (!token) return;
    setPhoneError("");
    const clean = newPhone.replace(/[^\d+]/g, "");
    if (!/^\+?\d{10,15}$/.test(clean)) {
      setPhoneError("Некорректный номер телефона");
      return;
    }
    setPhoneLoading(true);
    try {
      await api("/users/me/change-phone/send-code", {
        method: "POST",
        token,
        body: { newPhone: clean, method: phoneMethod },
      });
      setPhoneStep("code");
    } catch (err: unknown) {
      setPhoneError(err instanceof Error ? err.message : "Не удалось отправить код");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleConfirmPhoneCode = async () => {
    const token = getAccessToken();
    if (!token) return;
    setPhoneError("");
    if (!/^\d{4,8}$/.test(phoneCode)) {
      setPhoneError("Введите код из SMS/Telegram");
      return;
    }
    setPhoneLoading(true);
    try {
      const clean = newPhone.replace(/[^\d+]/g, "");
      await api("/users/me/change-phone/verify", {
        method: "POST",
        token,
        body: { newPhone: clean, code: phoneCode },
      });
      setPhoneModalOpen(false);
      setToast({ type: "success", message: "Телефон успешно изменён" });
      setTimeout(() => setToast(null), 3000);
      if (typeof window !== "undefined") {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (err: unknown) {
      setPhoneError(err instanceof Error ? err.message : "Не удалось подтвердить код");
    } finally {
      setPhoneLoading(false);
    }
  };

  useEffect(() => {
    // Load brands once
    api<ApiBrand[]>("/catalog/brands")
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!form.carBrandId) {
      setModels([]);
      return;
    }
    api<ApiModel[]>(`/catalog/models?brandId=${form.carBrandId}`)
      .then((data) => setModels(Array.isArray(data) ? data : []))
      .catch(() => setModels([]));
  }, [form.carBrandId]);

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
      city: string | null;
      carClass: string | null;
      carBrandId: string | null;
      carModelId: string | null;
      carYear: number | null;
      carPlate: string | null;
      licenseFrontUrl: string | null;
      licenseBackUrl: string | null;
      faceWithLicenseUrl: string | null;
      stsFrontUrl: string | null;
      stsBackUrl: string | null;
    }>("/users/me", { token })
      .then((me) => {
        setForm({
          ...EMPTY_FORM,
          firstName: me.firstName || "",
          lastName: me.lastName || "",
          patronymic: me.patronymic || "",
          email: me.email || "",
          birthDate: me.birthDate || "",
          city: me.city || "",
          carClass: me.carClass || "",
          carBrandId: me.carBrandId || "",
          carModelId: me.carModelId || "",
          carYear: me.carYear != null ? String(me.carYear) : "",
          carPlate: me.carPlate || "",
        });
        setDocs({
          licenseFront: me.licenseFrontUrl || null,
          licenseBack: me.licenseBackUrl || null,
          faceWithLicense: me.faceWithLicenseUrl || null,
          stsFront: me.stsFrontUrl || null,
          stsBack: me.stsBackUrl || null,
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
    setFieldError({});
    if (!form.lastName || !form.firstName || !form.birthDate) {
      setToast({ type: "error", message: "Заполните обязательные поля" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string | number> = {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
      };
      if (form.patronymic) payload.patronymic = form.patronymic;
      if (form.email) payload.email = form.email;
      if (form.city) payload.city = form.city;
      if (form.carClass) payload.carClass = form.carClass;
      if (form.carBrandId) payload.carBrandId = form.carBrandId;
      if (form.carModelId) payload.carModelId = form.carModelId;
      if (form.carYear) payload.carYear = Number(form.carYear);
      if (form.carPlate) payload.carPlate = form.carPlate;

      await api("/users/me", {
        method: "PATCH",
        token,
        body: payload,
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось сохранить профиль";
      if (/email/i.test(msg)) {
        setFieldError({ email: msg });
      } else if (/телефон|phone/i.test(msg)) {
        setFieldError({ phone: msg });
      }
      setToast({ type: "error", message: msg });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-[700px] text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  return (
    <div className="max-w-[700px] relative">
      {/* Phone change modal */}
      {phoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => !phoneLoading && setPhoneModalOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 md:p-8 w-full max-w-[440px]">
            <button
              type="button"
              onClick={() => !phoneLoading && setPhoneModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-medium text-[#303030] mb-1">
              {phoneStep === "enter" ? "Новый номер" : "Подтверждение"}
            </h2>
            <p className="text-xs text-[#A1A1A1] mb-5">
              {phoneStep === "enter"
                ? "Укажите новый номер и способ получения кода."
                : `Мы отправили код на ${newPhone} (${phoneMethod === "SMS" ? "SMS" : "Telegram"}).`}
            </p>

            {phoneStep === "enter" ? (
              <>
                <Input
                  label="Новый телефон"
                  placeholder="+7 (900) 000-00-00"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <div className="mt-4">
                  <p className="text-xs text-[#A1A1A1] mb-2">Способ подтверждения</p>
                  <div className="flex gap-2">
                    {(["SMS", "TELEGRAM"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPhoneMethod(m)}
                        className={`flex-1 h-[42px] rounded-lg border text-sm transition-colors ${
                          phoneMethod === m
                            ? "border-[#303030] bg-[#FAFAFA] text-[#303030]"
                            : "border-[#E5E5E5] text-[#A1A1A1] hover:border-[#A1A1A1]"
                        }`}
                      >
                        {m === "SMS" ? "SMS" : "Telegram"}
                      </button>
                    ))}
                  </div>
                </div>
                {phoneError && (
                  <p className="mt-3 text-xs text-[#FA6868]">{phoneError}</p>
                )}
                <Button
                  type="button"
                  className="w-full mt-5"
                  onClick={handleSendPhoneCode}
                  disabled={phoneLoading}
                >
                  {phoneLoading ? "Отправка..." : "Получить код"}
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Код подтверждения"
                  placeholder="000000"
                  inputMode="numeric"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                />
                {phoneError && (
                  <p className="mt-3 text-xs text-[#FA6868]">{phoneError}</p>
                )}
                <div className="flex gap-2 mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPhoneStep("enter")}
                    disabled={phoneLoading}
                  >
                    Назад
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleConfirmPhoneCode}
                    disabled={phoneLoading}
                  >
                    {phoneLoading ? "Проверка..." : "Подтвердить"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <CameraCapture
        open={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onCapture={(dataUrl) => {
          if (cameraTarget === "photo") {
            void uploadPhotoBase64(dataUrl);
          } else if (cameraTarget) {
            void uploadDocumentBase64(cameraTarget as DocumentType, dataUrl);
          }
        }}
        title={
          cameraTarget === "photo"
            ? "Сделайте фото профиля"
            : "Сфотографируйте документ"
        }
      />

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
          <button
            type="button"
            onClick={() => setCameraTarget("photo")}
            disabled={uploadingPhoto}
            className="text-sm text-[#A1A1A1] hover:text-[#303030] transition-colors underline disabled:opacity-50"
          >
            {uploadingPhoto ? "Загрузка..." : "Сделать фото"}
          </button>
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
        <div>
          <Input
            label="Email для уведомлений"
            type="email"
            placeholder="Email для уведомлений"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={fieldError.email ? "border-[#FA6868] focus:border-[#FA6868]" : undefined}
          />
          {fieldError.email && (
            <p className="mt-1 text-xs text-[#FA6868]">{fieldError.email}</p>
          )}
        </div>

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
            {([
              { type: "licenseFront" as DocumentType, label: "Водительские права\n(лицевая) *" },
              { type: "licenseBack" as DocumentType, label: "Водительские права\n(оборотная)" },
              { type: "faceWithLicense" as DocumentType, label: "Лицо с правами *" },
            ]).map((d) => {
              const url = docs[d.type];
              return (
                <button
                  key={d.type}
                  type="button"
                  onClick={() => setCameraTarget(d.type)}
                  className="relative border border-dashed border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#A1A1A1] transition-colors min-h-[110px]"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={d.label} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-[#A1A1A1] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-[10px] text-[#A1A1A1] whitespace-pre-line leading-tight px-2">{d.label}</span>
                      <span className="text-[10px] text-[#303030] mt-2 underline">Сделать фото</span>
                    </>
                  )}
                  {uploadingDoc === d.type && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="text-xs text-[#303030]">Загрузка...</span>
                    </div>
                  )}
                  {url && (
                    <div className="absolute bottom-1 right-1 bg-white/90 text-[9px] text-[#303030] rounded px-1.5 py-0.5">
                      Переснять
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STS photos */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { type: "stsFront" as DocumentType, label: "СТС\n(лицевая)" },
            { type: "stsBack" as DocumentType, label: "СТС\n(оборотная)" },
          ]).map((d) => {
            const url = docs[d.type];
            return (
              <button
                key={d.type}
                type="button"
                onClick={() => setCameraTarget(d.type)}
                className="relative border border-dashed border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#A1A1A1] transition-colors min-h-[90px]"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={d.label} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <svg className="w-6 h-6 text-[#A1A1A1] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="text-[10px] text-[#A1A1A1] whitespace-pre-line leading-tight px-2">{d.label}</span>
                    <span className="text-[10px] text-[#303030] mt-2 underline">Сделать фото</span>
                  </>
                )}
                {uploadingDoc === d.type && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-xs text-[#303030]">Загрузка...</span>
                  </div>
                )}
                {url && (
                  <div className="absolute bottom-1 right-1 bg-white/90 text-[9px] text-[#303030] rounded px-1.5 py-0.5">
                    Переснять
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Car plate */}
        <Input
          label="Гос номер авто"
          placeholder="А123АА 777"
          value={form.carPlate}
          onChange={(e) => update("carPlate", e.target.value)}
        />

        {/* Car brand select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Марка авто</label>
          <select
            value={form.carBrandId}
            onChange={(e) => {
              update("carBrandId", e.target.value);
              update("carModelId", "");
            }}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="">Марка авто</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Car model select */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Модель авто</label>
          <select
            value={form.carModelId}
            onChange={(e) => update("carModelId", e.target.value)}
            className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white appearance-none cursor-pointer"
            disabled={!form.carBrandId || models.length === 0}
          >
            <option value="">Модель авто</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
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
            {CAR_CLASS_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
