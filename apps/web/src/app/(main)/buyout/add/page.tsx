"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── types ─────────────────────────────────────────────── */

type OwnerType = "INDIVIDUAL" | "LEGAL" | "PARK" | "BANK";

const OWNER_OPTIONS: { value: OwnerType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Физическое лицо" },
  { value: "LEGAL", label: "Юридическое лицо" },
  { value: "PARK", label: "Таксопарк" },
  { value: "BANK", label: "Банк" },
];

const BRANDS = ["Kia", "Hyundai", "Skoda", "Toyota", "Volkswagen", "Chevrolet", "Lada"];

/* ── page ─────────────────────────────────────────────── */

export default function AddBuyoutPage() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [vin, setVin] = useState("");
  const [description, setDescription] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("INDIVIDUAL");

  /* owner-specific */
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgInn, setOrgInn] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((cur) => [...cur, ...files].slice(0, 10));
  };

  const removePhoto = (i: number) => {
    setPhotos((cur) => cur.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {/* Success modal */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl p-8 w-full max-w-[440px] mx-4 text-center">
            <div className="w-16 h-16 bg-[#F8D62E] rounded-full mx-auto flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-[#303030]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-[#303030] mb-2">Объявление создано</h2>
            <p className="text-sm text-[#A1A1A1] mb-6">
              Черновик сохранён. Супер-менеджер проверит данные и опубликует объявление в течение 1 рабочего дня.
            </p>
            <div className="flex gap-3">
              <Link href="/buyout" className="flex-1">
                <Button variant="outline" className="w-full">К объявлениям</Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full">На главную</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

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
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                  className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  <option value="">Выберите марку</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <Input label="Модель" placeholder="Rio, Solaris..." value={model} onChange={(e) => setModel(e.target.value)} required />
              <Input label="Год выпуска" type="number" placeholder="2022" value={year} onChange={(e) => setYear(e.target.value)} required />
              <Input label="Цена, ₽" type="number" placeholder="1 150 000" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <Input label="Пробег, км" type="number" placeholder="45 000" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
              <Input
                label="VIN (последние 7 символов)"
                placeholder="ABC1234"
                value={vin}
                maxLength={7}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                error={vin.length > 0 && vin.length < 7 ? "Должно быть 7 символов" : undefined}
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
                <Input label="ФИО владельца" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                <Input label="Контактный телефон" type="tel" placeholder="+7 (___) ___-__-__" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} required />
              </div>
            )}

            {(ownerType === "LEGAL" || ownerType === "PARK") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input label={ownerType === "PARK" ? "Название парка" : "Название организации"} value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                <Input label="ИНН" value={orgInn} onChange={(e) => setOrgInn(e.target.value)} required />
                <Input label="Контактное лицо" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                <Input label="Телефон" type="tel" placeholder="+7 (___) ___-__-__" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} required />
              </div>
            )}

            {ownerType === "BANK" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input label="Название банка" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                <Input label="ИНН банка" value={orgInn} onChange={(e) => setOrgInn(e.target.value)} required />
                <Input label="Залогодатель (ФИО)" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                <Input label="Телефон банка" type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} required />
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit">Отправить на модерацию</Button>
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
