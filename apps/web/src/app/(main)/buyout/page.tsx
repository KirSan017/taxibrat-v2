"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { OWNER_TYPE_LABELS } from "@/lib/labels";

interface ApiBrand {
  id: string;
  name: string;
}

interface ApiModel {
  id: string;
  name: string;
  brandId: string;
}

interface ApiBuyout {
  id: string;
  title: string;
  brandId: string;
  modelId: string;
  year: number;
  price: number;
  mileage: number | null;
  vin7: string;
  description: string | null;
  photos: string[];
  ownerType: string;
  isAdvertised: boolean;
  status: string;
  createdAt: string;
}

interface ApiBuyoutList {
  data: ApiBuyout[];
  total: number;
  page: number;
  limit: number;
}

const OWNER_TYPE_OPTIONS: Array<[string, string]> = [
  ["", "Все"],
  ["INDIVIDUAL", "Физ лицо"],
  ["LEGAL_ENTITY", "ЮР лицо"],
  ["TAXI_PARK", "Таксопарк"],
  ["BANK", "Банк"],
];

const YEARS = ["Все", "2024", "2023", "2022", "2021", "2020", "2019"];
const LIMIT = 8;

function ownerBadgeVariant(type: string) {
  switch (type) {
    case "TAXI_PARK": return "yellow" as const;
    case "BANK": return "red" as const;
    case "LEGAL_ENTITY": return "green" as const;
    default: return "gray" as const;
  }
}

export default function BuyoutPage() {
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("Все");
  const [ownerType, setOwnerType] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [page, setPage] = useState(1);

  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiModel[]>([]);

  const [listings, setListings] = useState<ApiBuyout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ApiBrand[]>("/catalog/brands")
      .then((d) => setBrands(Array.isArray(d) ? d : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelId("");
      return;
    }
    api<ApiModel[]>(`/catalog/models?brandId=${brandId}`)
      .then((d) => setModels(Array.isArray(d) ? d : []))
      .catch(() => setModels([]));
  }, [brandId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (modelId) params.set("modelId", modelId);
    if (year !== "Все") params.set("year", year);
    if (ownerType) params.set("ownerType", ownerType);
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    setLoading(true);
    setError("");
    api<ApiBuyoutList>(`/buyout?${params.toString()}`)
      .then((d) => {
        setListings(d?.data ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setListings([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [brandId, modelId, year, ownerType, priceFrom, priceTo, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
                Выкуп авто
              </h1>
              <p className="mt-3 text-sm text-[#A1A1A1] max-w-md leading-relaxed">
                Подберите автомобиль для работы в такси с выгодными условиями выкупа от проверенных парков и владельцев.
              </p>
            </div>
            <div className="bg-[#F8D62E] rounded-xl px-6 py-3 inline-flex items-center gap-2 shrink-0">
              <span className="text-2xl md:text-3xl font-medium text-[#303030]">{total}</span>
              <span className="text-xs text-[#303030]/70">объявлений</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* ══════ FILTERS ══════ */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Brand */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Марка</label>
              <select
                value={brandId}
                onChange={(e) => { setBrandId(e.target.value); setModelId(""); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                <option value="">Все</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Модель</label>
              <select
                value={modelId}
                onChange={(e) => { setModelId(e.target.value); setPage(1); }}
                disabled={!brandId || models.length === 0}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none disabled:bg-gray-50"
              >
                <option value="">Все</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Год</label>
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Owner type */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Владелец</label>
              <select
                value={ownerType}
                onChange={(e) => { setOwnerType(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {OWNER_TYPE_OPTIONS.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {/* Price from */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Цена от</label>
              <input
                type="number"
                placeholder="500 000"
                value={priceFrom}
                onChange={(e) => { setPriceFrom(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
              />
            </div>

            {/* Price to */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Цена до</label>
              <input
                type="number"
                placeholder="3 000 000"
                value={priceTo}
                onChange={(e) => { setPriceTo(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
              />
            </div>

            {/* Show button */}
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button size="sm" className="w-full" onClick={() => setPage(1)}>
                Показать {total} шт
              </Button>
            </div>
          </div>
        </section>

        {/* ══════ RESULTS ══════ */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#A1A1A1]">
            Найдено <span className="text-[#303030] font-medium">{total}</span> объявлений
          </p>
          {error && <span className="text-sm text-[#FA6868]">{error}</span>}
        </div>

        {/* ══════ CARDS GRID ══════ */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[320px] rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl px-6 py-16 text-center mb-8">
            <h3 className="text-base font-medium text-[#303030] mb-1">Объявления не найдены</h3>
            <p className="text-sm text-[#A1A1A1]">Попробуйте изменить параметры фильтра.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {listings.map((car) => {
              const ownerLabel = OWNER_TYPE_LABELS[car.ownerType] ?? car.ownerType;
              const mainPhoto = car.photos?.[0];
              return (
                <Link
                  key={car.id}
                  href={`/buyout/${car.id}`}
                  className={`block bg-white rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
                    car.isAdvertised
                      ? "border-2 border-green-500 ring-1 ring-green-500/20"
                      : "border border-[#E5E5E5]"
                  }`}
                >
                  {/* Photo */}
                  <div className="relative h-[200px] bg-gray-200 flex items-center justify-center">
                    {mainPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mainPhoto} alt={car.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    )}
                    {car.isAdvertised && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="green">Рекомендуем</Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-medium text-[#303030]">{car.title}</h3>
                      <Badge variant={ownerBadgeVariant(car.ownerType)}>{ownerLabel}</Badge>
                    </div>
                    <p className="text-xl font-medium text-[#303030] mb-1">
                      {car.price.toLocaleString("ru-RU")} ₽
                    </p>
                    {car.mileage != null && (
                      <p className="text-sm text-[#A1A1A1]">
                        Пробег: {car.mileage.toLocaleString("ru-RU")} км
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ══════ PAGINATION ══════ */}
        {totalPages > 1 && !loading && (
          <nav className="flex items-center justify-center gap-1 mb-12">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
            >
              &laquo;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-[#303030] text-white"
                    : "text-[#303030] hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
            >
              &raquo;
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
