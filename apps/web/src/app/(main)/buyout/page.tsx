"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    case "TAXI_PARK":
      return "yellow" as const;
    case "BANK":
      return "red" as const;
    case "LEGAL_ENTITY":
      return "green" as const;
    default:
      return "gray" as const;
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
      {/* ══════ HERO — dark green with illustration ══════ */}
      <section className="bg-[#1F1F1F] relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[80px] pb-[60px] md:pt-[140px] md:pb-[100px]">
          <div className="grid md:grid-cols-[1fr_auto] gap-[30px] md:gap-[60px] items-center">
            <div className="max-w-[700px]">
              <p className="text-[16px] md:text-[20px] font-medium text-[#3BB560] leading-[26px] mb-[16px] md:mb-[30px]">
                Выкуп автомобилей
              </p>
              <h1 className="text-[32px] md:text-[60px] leading-[1.08] font-medium text-white tracking-[-0.02em] mb-[20px] md:mb-[30px]">
                Авто под <span className="text-[#3BB560]">выкуп</span>
                <br /> с&nbsp;выгодными условиями
              </h1>
              <p className="text-[14px] md:text-[16px] leading-[24px] font-normal text-white/70 max-w-[520px] mb-[30px] md:mb-[40px]">
                Подберите автомобиль для работы в&nbsp;такси от&nbsp;проверенных парков и&nbsp;владельцев.
                Менеджер сопроводит вас до&nbsp;полного выкупа авто.
              </p>

              <div className="flex items-center gap-[12px] flex-wrap">
                <div className="inline-flex items-center gap-[10px] h-[56px] md:h-[72px] px-[24px] md:px-[32px] bg-[#3BB560] rounded-[16px]">
                  <span className="text-[28px] md:text-[36px] font-medium text-white leading-none">
                    {total}
                  </span>
                  <span className="text-[12px] md:text-[14px] text-white/80 leading-tight max-w-[80px]">
                    объявлений
                  </span>
                </div>
                <Link
                  href="/buyout/add"
                  className="inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-white text-[#303030] text-[14px] font-medium hover:bg-white/90 transition-colors"
                >
                  Разместить авто
                </Link>
              </div>
            </div>
            <div className="hidden md:block w-[320px] lg:w-[420px]">
              <Image
                src="/figma/feature-buyout.png"
                alt=""
                width={640}
                height={640}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[40px] md:pt-[60px] pb-[40px] md:pb-[60px]">
        {/* ══════ FILTERS ══════ */}
        <section className="mb-[40px] md:mb-[60px]">
          <h2 className="text-[22px] md:text-[34px] font-semibold text-[#303030] mb-[20px] md:mb-[30px] tracking-[-0.01em]">
            Найдите подходящий авто
          </h2>
          <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[20px] md:p-[30px]">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-[10px]">
              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Марка</label>
                <select
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    setModelId("");
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  <option value="">Все</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Модель</label>
                <select
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value);
                    setPage(1);
                  }}
                  disabled={!brandId || models.length === 0}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none disabled:bg-[#FAFAFA]"
                >
                  <option value="">Все</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Год</label>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Владелец</label>
                <select
                  value={ownerType}
                  onChange={(e) => {
                    setOwnerType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {OWNER_TYPE_OPTIONS.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Цена от</label>
                <input
                  type="number"
                  placeholder="500 000"
                  value={priceFrom}
                  onChange={(e) => {
                    setPriceFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Цена до</label>
                <input
                  type="number"
                  placeholder="3 000 000"
                  value={priceTo}
                  onChange={(e) => {
                    setPriceTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none placeholder:text-[#B0B0B0]"
                />
              </div>

              <div className="flex items-end col-span-2 md:col-span-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="w-full inline-flex items-center justify-center h-[49px] px-[20px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[14px] font-medium hover:bg-[#F8D62E]/90 transition-colors"
                >
                  Показать {total} шт
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════ RESULTS HEADER ══════ */}
        <div className="flex items-center justify-between mb-[20px]">
          <p className="text-[14px] text-[#A1A1A1]">
            Найдено <span className="text-[#303030] font-medium">{total}</span> объявлений
          </p>
          {error && <span className="text-[14px] text-[#FA6868]">{error}</span>}
        </div>

        {/* ══════ CARDS GRID ══════ */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[40px] md:mb-[60px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[360px] rounded-[20px] bg-[#FAFAFA] animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#EFEFEF] rounded-[20px] px-[30px] py-[80px] text-center mb-[40px]">
            <div className="w-[64px] h-[64px] bg-[#F3F1E7] rounded-full mx-auto flex items-center justify-center mb-[16px]">
              <svg
                className="w-[32px] h-[32px] text-[#A1A1A1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium text-[#303030] mb-[6px]">
              Объявления не найдены
            </h3>
            <p className="text-[14px] text-[#A1A1A1]">Попробуйте изменить параметры фильтра.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[40px] md:mb-[60px]">
            {listings.map((car) => {
              const ownerLabel = OWNER_TYPE_LABELS[car.ownerType] ?? car.ownerType;
              const mainPhoto = car.photos?.[0];
              return (
                <Link
                  key={car.id}
                  href={`/buyout/${car.id}`}
                  className={`group block bg-white rounded-[20px] overflow-hidden transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
                    car.isAdvertised
                      ? "border-2 border-[#3BB560] ring-1 ring-[#3BB560]/20"
                      : "border border-[#EFEFEF]"
                  }`}
                >
                  {/* Photo */}
                  <div className="relative h-[240px] bg-[#F3F1E7] flex items-center justify-center overflow-hidden">
                    {mainPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mainPhoto}
                        alt={car.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <svg
                        className="w-[48px] h-[48px] text-[#A1A1A1]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                        />
                      </svg>
                    )}
                    {car.isAdvertised && (
                      <div className="absolute top-[16px] left-[16px]">
                        <Badge variant="green">Рекомендуем</Badge>
                      </div>
                    )}
                    <div className="absolute top-[16px] right-[16px]">
                      <Badge variant={ownerBadgeVariant(car.ownerType)}>{ownerLabel}</Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-[24px] md:p-[30px]">
                    <h3 className="text-[18px] md:text-[22px] font-medium text-[#303030] mb-[8px] leading-[1.2]">
                      {car.title}
                    </h3>
                    {car.mileage != null && (
                      <p className="text-[13px] text-[#A1A1A1] mb-[16px]">
                        Пробег: {car.mileage.toLocaleString("ru-RU")} км · {car.year}
                      </p>
                    )}
                    <div className="flex items-end justify-between">
                      <p className="text-[24px] md:text-[28px] font-medium text-[#303030] tracking-[-0.01em]">
                        {car.price.toLocaleString("ru-RU")} ₽
                      </p>
                      <span className="inline-flex items-center justify-center h-[42px] px-[18px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[13px] font-medium">
                        Подробнее
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ══════ PAGINATION ══════ */}
        {totalPages > 1 && !loading && (
          <nav className="flex items-center justify-center gap-[4px] mb-[40px] md:mb-[60px]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-[42px] h-[42px] flex items-center justify-center rounded-[10px] text-[14px] text-[#A1A1A1] hover:bg-[#F3F1E7] disabled:opacity-30 transition-colors"
            >
              &laquo;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-[42px] h-[42px] flex items-center justify-center rounded-[10px] text-[14px] font-medium transition-colors ${
                  p === page
                    ? "bg-[#303030] text-white"
                    : "text-[#303030] hover:bg-[#F3F1E7]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-[42px] h-[42px] flex items-center justify-center rounded-[10px] text-[14px] text-[#A1A1A1] hover:bg-[#F3F1E7] disabled:opacity-30 transition-colors"
            >
              &raquo;
            </button>
          </nav>
        )}
      </div>

      {/* ══════ CTA BAND ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pb-[60px] md:pb-[100px]">
          <div className="bg-[#3BB560] rounded-[20px] p-[30px] md:p-[50px] grid md:grid-cols-[1fr_auto] gap-[30px] items-center relative overflow-hidden">
            <div className="relative z-10 max-w-[620px]">
              <h3 className="text-[22px] md:text-[34px] font-semibold text-white leading-[1.15] tracking-[-0.01em]">
                Не нашли подходящее авто?
              </h3>
              <p className="mt-[12px] md:mt-[16px] text-[13px] md:text-[14px] leading-[22px] text-white/85 max-w-[480px]">
                Опишите параметры — наш менеджер подберёт автомобиль под выкуп из&nbsp;закрытой базы партнёров.
              </p>
              <Link
                href="/support/new"
                className="mt-[20px] md:mt-[30px] inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-white text-[#303030] text-[14px] font-medium hover:bg-white/90 transition-colors"
              >
                Оставить заявку
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
