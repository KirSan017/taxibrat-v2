"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECTION_TITLE,
  ADMIN_SELECT,
  ADMIN_TEXTAREA,
} from "@/components/admin/admin-styles";

/* ── types ─────────────────────────────────────────────── */

type OwnerType = "INDIVIDUAL" | "LEGAL_ENTITY" | "TAXI_PARK" | "BANK";

const OWNER_OPTIONS: { value: OwnerType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Физ. лицо" },
  { value: "LEGAL_ENTITY", label: "Юр. лицо" },
  { value: "TAXI_PARK", label: "Таксопарк" },
  { value: "BANK", label: "Банк" },
];

interface Brand {
  id: string;
  name: string;
}
interface Model {
  id: string;
  name: string;
  brandId: string;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminBuyoutAddPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role;
  const canSeeOwner = role === "SUPER_MANAGER" || role === "ADMIN";
  const canAdvertise = role === "ADMIN";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [photos, setPhotos] = useState<File[]>([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [vin, setVin] = useState("");
  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("INDIVIDUAL");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgInn, setOrgInn] = useState("");

  const [advertised, setAdvertised] = useState(false);
  const [successAction, setSuccessAction] = useState<"draft" | "review" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Brand[]>("/catalog/brands")
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelId("");
      return;
    }
    setLoadingModels(true);
    api<Model[]>(`/catalog/models?brandId=${brandId}`)
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [brandId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((cur) => [...cur, ...files].slice(0, 10));
  };

  const removePhoto = (i: number) => {
    setPhotos((cur) => cur.filter((_, idx) => idx !== i));
  };

  const submit = async (action: "draft" | "review") => {
    setError(null);
    const token = getAccessToken();
    if (!token) {
      setError("Нет доступа");
      return;
    }
    if (!brandId || !modelId) {
      setError("Выберите марку и модель");
      return;
    }
    if (vin.length !== 7) {
      setError("VIN должен содержать 7 символов");
      return;
    }
    setSubmitting(true);
    try {
      await api("/buyout", {
        method: "POST",
        token,
        body: {
          brandId,
          modelId,
          year: Number(year),
          price: Number(price),
          mileage: mileage ? Number(mileage) : undefined,
          vin7: vin,
          description: description || undefined,
          photos: [],
          ownerType,
        },
      });
      setSuccessAction(action);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать объявление");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    submit("draft");
  };

  const handleSendToReview = () => {
    submit("review");
  };

  return (
    <>
      <SuccessModal
        open={!!successAction}
        onClose={() => setSuccessAction(null)}
        title={successAction === "draft" ? "Черновик сохранён" : "Отправлено на проверку"}
        description={
          successAction === "draft"
            ? "Объявление сохранено и доступно для редактирования."
            : "Объявление отправлено супер-менеджеру для финальной проверки."
        }
        ctaLabel="К списку"
        onCta={() => router.push("/admin/buyout")}
      />

      <div className="max-w-[1100px]">
        {/* ── Breadcrumb ── */}
        <Link
          href="/admin/buyout"
          className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-4"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          К списку объявлений
        </Link>

        {/* ── Header ── */}
        <div className="mb-6">
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">
            Новое
          </p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>Добавить объявление</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Заполните данные об автомобиле. Черновик можно сохранить и дополнить позже.
          </p>
        </div>

        <form onSubmit={handleSaveDraft} className="space-y-5">
          {/* Photos */}
          <section className={`${ADMIN_CARD} p-5 md:p-6`}>
            <div className="mb-4">
              <h2 className={ADMIN_SECTION_TITLE}>Фотографии</h2>
              <p className="text-xs text-[#A1A1A1] mt-1">
                До 10 фотографий. Первая станет главной.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative aspect-square bg-[#F4F4F4] rounded-[14px] overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(photo)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-[#F8D62E] text-[#1F1F1F] px-2 py-0.5 rounded-full">
                      Главное
                    </span>
                  )}
                </div>
              ))}
              {photos.length < 10 && (
                <label className="aspect-square border-2 border-dashed border-[#E5E5E5] rounded-[14px] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#F8D62E] hover:bg-[#FFFBE6] transition-colors">
                  <svg
                    className="w-7 h-7 text-[#A1A1A1]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[11px] text-[#A1A1A1] font-medium">
                    Добавить фото
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Car info */}
          <section className={`${ADMIN_CARD} p-5 md:p-6 space-y-5`}>
            <h2 className={ADMIN_SECTION_TITLE}>Об автомобиле</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Марка
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  required
                  className={ADMIN_SELECT}
                >
                  <option value="">Выберите марку</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Модель
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  required
                  disabled={!brandId || loadingModels}
                  className={`${ADMIN_SELECT} disabled:bg-[#FAFAFA]`}
                >
                  <option value="">{loadingModels ? "Загрузка..." : "Выберите модель"}</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {[
                { label: "Год выпуска", value: year, onChange: setYear, type: "number", placeholder: "2022", required: true },
                { label: "Цена, ₽", value: price, onChange: setPrice, type: "number", placeholder: "1 150 000", required: true },
                { label: "Пробег, км", value: mileage, onChange: setMileage, type: "number", placeholder: "45 000" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    className={ADMIN_INPUT}
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  VIN (7 символов)
                </label>
                <input
                  type="text"
                  value={vin}
                  maxLength={7}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="ABC1234"
                  required
                  className={ADMIN_INPUT}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Комплектация, состояние, условия выкупа..."
                className={ADMIN_TEXTAREA}
              />
            </div>

            {canAdvertise && (
              <label className="flex items-center justify-between gap-3 pt-2 cursor-pointer">
                <span className="text-sm font-medium text-[#1F1F1F]">
                  Рекламировать (выделить в каталоге)
                </span>
                <button
                  type="button"
                  onClick={() => setAdvertised((v) => !v)}
                  className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${
                    advertised ? "bg-[#F8D62E]" : "bg-[#E5E5E5]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition ${
                      advertised ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            )}
          </section>

          {/* Owner */}
          {canSeeOwner && (
            <section className={`${ADMIN_CARD} p-5 md:p-6 space-y-5`}>
              <div className="flex items-center justify-between">
                <h2 className={ADMIN_SECTION_TITLE}>Владелец</h2>
                <span className="text-[11px] text-[#A1A1A1] font-medium">
                  Видят только SM/Admin
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OWNER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOwnerType(opt.value)}
                    className={`px-3 h-[44px] rounded-[10px] text-sm font-medium border transition-colors ${
                      ownerType === opt.value
                        ? "bg-[#1F1F1F] text-white border-[#1F1F1F]"
                        : "bg-white text-[#1F1F1F] border-[#E5E5E5] hover:border-[#1F1F1F]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {ownerType === "INDIVIDUAL" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "ownerName", label: "ФИО", value: ownerName, set: setOwnerName },
                    { key: "ownerPhone", label: "Телефон", value: ownerPhone, set: setOwnerPhone, type: "tel", placeholder: "+7 (___) ___-__-__" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type || "text"}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        className={ADMIN_INPUT}
                      />
                    </div>
                  ))}
                </div>
              )}

              {(ownerType === "LEGAL_ENTITY" || ownerType === "TAXI_PARK") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      label: ownerType === "TAXI_PARK" ? "Название парка" : "Название организации",
                      value: orgName,
                      set: setOrgName,
                    },
                    { label: "ИНН", value: orgInn, set: setOrgInn },
                    { label: "Контактное лицо", value: ownerName, set: setOwnerName },
                    { label: "Телефон", value: ownerPhone, set: setOwnerPhone, type: "tel" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type || "text"}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className={ADMIN_INPUT}
                      />
                    </div>
                  ))}
                </div>
              )}

              {ownerType === "BANK" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Название банка", value: orgName, set: setOrgName },
                    { label: "ИНН банка", value: orgInn, set: setOrgInn },
                    { label: "Залогодатель (ФИО)", value: ownerName, set: setOwnerName },
                    { label: "Телефон", value: ownerPhone, set: setOwnerPhone, type: "tel" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type || "text"}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className={ADMIN_INPUT}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4">
              <p className="text-sm text-[#FA6868]">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className={`${ADMIN_CARD} p-4 flex flex-wrap items-center gap-3`}>
            <button type="submit" className={ADMIN_OUTLINE_BTN} disabled={submitting}>
              Сохранить как черновик
            </button>
            <button
              type="button"
              onClick={handleSendToReview}
              className={ADMIN_PRIMARY_BTN}
              disabled={submitting}
            >
              {submitting ? "Отправка..." : "Отправить на проверку SM"}
            </button>
            <Link
              href="/admin/buyout"
              className="inline-flex items-center justify-center gap-2 h-[44px] px-4 rounded-[10px] text-sm font-medium text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
