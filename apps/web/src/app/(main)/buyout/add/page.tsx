"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ─────────────────────────────────────────────── */

type OwnerType = "INDIVIDUAL" | "LEGAL_ENTITY" | "TAXI_PARK" | "BANK";

const OWNER_OPTIONS: { value: OwnerType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Физическое лицо" },
  { value: "LEGAL_ENTITY", label: "Юридическое лицо" },
  { value: "TAXI_PARK", label: "Таксопарк" },
  { value: "BANK", label: "Банк" },
];

interface Brand { id: string; name: string; }
interface Model { id: string; name: string; brandId: string; }

/* ── page ─────────────────────────────────────────────── */

export default function AddBuyoutPage() {
  const router = useRouter();

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

  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = getAccessToken();
    if (!token) {
      setError("Войдите в аккаунт, чтобы разместить объявление");
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
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать объявление");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SuccessModal
        open={submitted}
        onClose={() => setSubmitted(false)}
        title="Объявление создано"
        description="Черновик сохранён. Супер-менеджер проверит данные и опубликует объявление в течение 1 рабочего дня."
        ctaLabel="На главную"
        onCta={() => router.push("/")}
        secondaryLabel="К объявлениям"
        onSecondary={() => router.push("/buyout")}
      />

      <div className="max-w-[720px] mx-auto px-6 py-8 md:py-12">
        <div className="mb-6">
          <Link href="/buyout" className="text-xs text-[#A1A1A1] hover:text-[#303030] inline-flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К списку объявлений
          </Link>
          <h1 className="text-2xl md:text-3xl font-medium text-[#303030] mt-3">Разместить объявление</h1>
          <p className="text-sm text-[#A1A1A1] mt-2">
            Заполните информацию об автомобиле — после проверки объявление попадёт в каталог
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <section className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="text-sm font-medium text-[#303030] mb-1">Фотографии</h2>
            <p className="text-xs text-[#A1A1A1] mb-4">До 10 фотографий. Первая станет главной.</p>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] bg-[#F8D62E] text-[#303030] px-1.5 py-0.5 rounded">
                      Главное
                    </span>
                  )}
                </div>
              ))}
              {photos.length < 10 && (
                <label className="aspect-square border-2 border-dashed border-[#E5E5E5] rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#303030] transition-colors">
                  <svg className="w-6 h-6 text-[#A1A1A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[10px] text-[#A1A1A1]">Добавить</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </section>

          {/* Car info */}
          <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-sm font-medium text-[#303030]">Об автомобиле</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">Марка</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  required
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  <option value="">Выберите марку</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">Модель</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  required
                  disabled={!brandId || loadingModels}
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none disabled:bg-gray-50"
                >
                  <option value="">{loadingModels ? "Загрузка..." : "Выберите модель"}</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <Input label="Год выпуска" type="number" placeholder="2022" value={year} onChange={(e) => setYear(e.target.value)} required />
              <Input label="Цена, ₽" type="number" placeholder="1 150 000" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <Input label="Пробег, км" type="number" placeholder="45 000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
              <Input
                label="VIN (последние 7 символов)"
                placeholder="ABC1234"
                value={vin}
                maxLength={7}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                error={vin.length > 0 && vin.length < 7 ? "Должно быть 7 символов" : undefined}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#303030] mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Комплектация, состояние, условия выкупа..."
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-none"
              />
            </div>
          </section>

          {/* Owner type */}
          <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-sm font-medium text-[#303030]">Тип владельца</h2>

            <div className="grid grid-cols-2 gap-2">
              {OWNER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOwnerType(opt.value)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                    ownerType === opt.value
                      ? "bg-[#303030] text-white border-[#303030]"
                      : "bg-white text-[#303030] border-[#E5E5E5] hover:border-[#303030]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {ownerType === "INDIVIDUAL" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input label="ФИО владельца" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                <Input label="Контактный телефон" type="tel" placeholder="+7 (___) ___-__-__" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
            )}

            {(ownerType === "LEGAL_ENTITY" || ownerType === "TAXI_PARK") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input label={ownerType === "TAXI_PARK" ? "Название парка" : "Название организации"} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Input label="ИНН" value={orgInn} onChange={(e) => setOrgInn(e.target.value)} />
                <Input label="Контактное лицо" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                <Input label="Телефон" type="tel" placeholder="+7 (___) ___-__-__" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
            )}

            {ownerType === "BANK" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input label="Название банка" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Input label="ИНН банка" value={orgInn} onChange={(e) => setOrgInn(e.target.value)} />
                <Input label="Залогодатель (ФИО)" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                <Input label="Телефон банка" type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
            )}
            <p className="text-[11px] text-[#A1A1A1]">Данные владельца видны только супер-менеджеру и администратору.</p>
          </section>

          {error && (
            <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-lg px-4 py-3">
              <p className="text-sm text-[#FA6868]">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить на модерацию"}
            </Button>
            <Link href="/buyout">
              <Button type="button" variant="outline">Отмена</Button>
            </Link>
          </div>

          <p className="text-[11px] text-[#A1A1A1] leading-relaxed">
            Объявление будет сохранено как черновик. После проверки супер-менеджером оно станет доступным в каталоге.
          </p>
        </form>
      </div>
    </>
  );
}
