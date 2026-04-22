"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import {
  DRIVER_CLASS_LABELS,
  DRIVER_CLASS_FROM_LABEL,
  DISTRICT_LABELS,
} from "@/lib/labels";

interface ApiParkClass {
  id: string;
  parkName: string | null;
  parkAddress: string | null;
  parkPhone?: string | null;
  driverClass: string;
  rating: string | number;
  deposit: number;
  parkCommission: string | number;
  hasAvailableCars: boolean;
  isAdvertised?: boolean;
  isSuperAdvertised?: boolean;
  nameHidden?: boolean;
  addressHidden?: boolean;
}

interface ApiBrand {
  id: string;
  name: string;
}

interface ApiModel {
  id: string;
  name: string;
  brandId: string;
}

interface HonorBoardItem {
  id: string;
  name: string;
  checks: number;
  avatar: string;
}

interface PublicStats {
  users: number;
  parks: number;
  no9Orders: number;
  buyoutCars: number;
}

const DRIVER_CLASS_OPTIONS = ["Все", ...Object.values(DRIVER_CLASS_LABELS)];
const YEAR_OPTIONS = ["Все", "2024", "2023", "2022", "2021", "2020"];

// All Moscow districts + Moscow Region cities/districts, per TЗ.
const MOSCOW_DISTRICT_CODES = [
  "CAO", "SAO", "SVAO", "VAO", "UVAO", "UAO", "UZAO", "ZAO", "SZAO",
] as const;
const MO_DISTRICT_CODES = [
  "MYTISCHI", "KRASNOGORSK", "DOLGOPRUDNY", "KHIMKI", "ODINTSOVO",
  "NOVOMOSKOVSKY", "BUTOVO", "VIDNOE", "LUBERTSY", "REUTOV", "BALASHIKHA",
] as const;

const DISTRICT_OPTIONS: Array<[string, string]> = [
  ...MOSCOW_DISTRICT_CODES.map((c) => [c, DISTRICT_LABELS[c] ?? c] as [string, string]),
  ...MO_DISTRICT_CODES.map((c) => [c, DISTRICT_LABELS[c] ?? c] as [string, string]),
];

const DISTRICT_PRESETS: Array<{ key: string; label: string; districts: string[] }> = [
  { key: "ALL", label: "Вся база", districts: [] },
  { key: "MOSCOW_MO", label: "Москва и МО", districts: [...MOSCOW_DISTRICT_CODES, ...MO_DISTRICT_CODES] },
  { key: "MOSCOW", label: "Москва", districts: [...MOSCOW_DISTRICT_CODES] },
];

const FILTER_INSTRUCTION_KEY = "parks_filter_instruction_seen";

const LIMIT = 10;

export default function ParksPage() {
  const router = useRouter();
  const [driverClassLabel, setDriverClassLabel] = useState("Все");
  const [honorBoard, setHonorBoard] = useState<HonorBoardItem[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("Все");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiModel[]>([]);
  const [parks, setParks] = useState<ApiParkClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    api<ApiBrand[]>("/catalog/brands")
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    api<HonorBoardItem[]>("/public/honor-board")
      .then((data) => setHonorBoard(Array.isArray(data) ? data : []))
      .catch(() => setHonorBoard([]));
    api<PublicStats>("/public/stats")
      .then((data) => setPublicStats(data))
      .catch(() => setPublicStats(null));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelId("");
      return;
    }
    api<ApiModel[]>(`/catalog/models?brandId=${brandId}`)
      .then((data) => setModels(Array.isArray(data) ? data : []))
      .catch(() => setModels([]));
  }, [brandId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (driverClassLabel !== "Все") {
      const enumVal = DRIVER_CLASS_FROM_LABEL[driverClassLabel];
      if (enumVal) params.set("driverClass", enumVal);
    }
    if (brandId) params.set("brandId", brandId);
    if (modelId) params.set("modelId", modelId);
    if (year !== "Все") params.set("year", year);
    if (selectedDistricts.length > 0) params.set("district", selectedDistricts.join(","));
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    setLoading(true);
    setError("");
    api<ApiParkClass[]>(`/catalog/classes?${params.toString()}`)
      .then((data) => setParks(Array.isArray(data) ? data : []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setParks([]);
      })
      .finally(() => setLoading(false));
  }, [driverClassLabel, brandId, modelId, year, selectedDistricts, page]);

  const maybeShowInstruction = () => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(FILTER_INSTRUCTION_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setInstructionOpen(true);
  };

  const dismissInstruction = () => {
    setInstructionOpen(false);
    if (dontShowAgain && typeof window !== "undefined") {
      try {
        localStorage.setItem(FILTER_INSTRUCTION_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  const toggleDistrict = (d: string) => {
    maybeShowInstruction();
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
    setPage(1);
  };

  const applyPreset = (preset: { districts: string[] }) => {
    maybeShowInstruction();
    setSelectedDistricts(preset.districts);
    setPage(1);
  };

  const resetFilters = () => {
    setDriverClassLabel("Все");
    setBrandId("");
    setModelId("");
    setYear("Все");
    setSelectedDistricts([]);
    setPage(1);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    try {
      const res = await api<{
        found: { id: string; name: string } | null;
        hiddenAboveAverage?: boolean;
      }>(`/public/parks/search?name=${encodeURIComponent(q)}`);
      if (res.found && res.hiddenAboveAverage) {
        router.push(`/parks/hidden?name=${encodeURIComponent(res.found.name)}`);
      }
    } catch {
      /* fall back */
    }
  };

  const filteredBySearch = searchQuery.trim()
    ? parks.filter((p) =>
        (p.parkName ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : parks;

  const hasNextPage = parks.length === LIMIT;

  const classLabel = (cls: string) => DRIVER_CLASS_LABELS[cls] ?? cls;

  return (
    <>
      {/* ══════ HERO BANNER — beige, big yellow 148 ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[80px] pb-[50px] md:pt-[140px] md:pb-[80px]">
          <div className="grid md:grid-cols-[1fr_auto] gap-[40px] md:gap-[60px] items-center">
            {/* Left — headline + yellow stat */}
            <div>
              <h1 className="text-[32px] md:text-[60px] leading-[1.08] font-medium text-[#303030] tracking-[-0.02em]">
                Рейтинг таксопарков
                <br />
                <span className="text-[#F8D62E]">№1</span> в&nbsp;Москве
              </h1>

              <div className="mt-[30px] md:mt-[50px] flex flex-wrap items-center gap-[24px] md:gap-[40px]">
                <div className="flex items-center gap-[20px] md:gap-[30px]">
                  <span className="text-[78px] md:text-[139px] leading-[0.85] font-medium text-[#F8D62E] tracking-[-0.04em]">
                    {publicStats?.parks ?? 148}
                  </span>
                  <p className="text-[14px] md:text-[20px] leading-[1.25] font-medium text-[#303030] max-w-[220px]">
                    Таксопарков
                    <br />
                    проверено
                  </p>
                </div>

                <div className="inline-flex items-center gap-[10px] h-[56px] md:h-[72px] px-[24px] md:px-[32px] bg-[#F8D62E] rounded-[16px]">
                  <span className="text-[28px] md:text-[36px] font-medium text-[#303030] leading-none">
                    {publicStats ? `${publicStats.users.toLocaleString("ru-RU")}+` : "615+"}
                  </span>
                  <span className="text-[12px] md:text-[14px] text-[#303030]/70 leading-tight max-w-[96px]">
                    пользователей
                  </span>
                </div>
              </div>
            </div>

            {/* Right — illustration */}
            <div className="hidden md:block w-[320px] lg:w-[420px]">
              <Image
                src="/figma/check-taxis.png"
                alt=""
                width={691}
                height={604}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pt-[40px] md:pt-[60px] pb-[40px] md:pb-[60px]">
        {/* ══════ HONOR BOARD ══════ */}
        {honorBoard.length > 0 && (
          <section className="mb-[40px] md:mb-[60px]">
            <h2 className="text-[20px] md:text-[28px] font-medium text-[#303030] mb-[20px] tracking-[-0.01em]">
              Доска почёта
            </h2>
            <div className="flex gap-[12px] overflow-x-auto pb-2 scrollbar-hide">
              {honorBoard.map((hb, idx) => (
                <div
                  key={hb.id}
                  className="flex-none flex items-center gap-[12px] bg-white border border-[#EFEFEF] rounded-[16px] px-[16px] py-[12px] min-w-[220px]"
                >
                  <div className="w-[38px] h-[38px] rounded-full bg-[#F3F1E7] flex items-center justify-center text-[14px] font-medium text-[#303030] shrink-0">
                    {hb.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#303030] truncate">{hb.name}</p>
                    <p className="text-[12px] text-[#A1A1A1]">{hb.checks} проверок</p>
                  </div>
                  {idx < 3 && (
                    <Badge variant="yellow" className="ml-auto shrink-0">
                      #{idx + 1}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════ FILTERS BLOCK ══════ */}
        <section className="mb-[40px] md:mb-[60px]">
          <h2 className="text-[22px] md:text-[34px] font-semibold text-[#303030] mb-[20px] md:mb-[30px] tracking-[-0.01em] leading-[1.15]">
            Выберите параметры и&nbsp;найдите таксопарк
          </h2>

          {/* Filter card */}
          <div className="bg-white border border-[#EFEFEF] rounded-[20px] p-[20px] md:p-[30px]">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-[10px] mb-[20px]">
              <div className="flex-1 relative">
                <svg
                  className="absolute left-[16px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#A1A1A1] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск по названию парка..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[49px] pl-[44px] pr-[16px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-[#FAFAFA] focus:bg-white focus:border-[#303030] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-[#303030] text-white text-[14px] font-medium hover:bg-[#404040] transition-colors"
              >
                Найти
              </button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-[10px]">
              {/* Driver class */}
              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Класс водителя</label>
                <select
                  value={driverClassLabel}
                  onChange={(e) => { maybeShowInstruction(); setDriverClassLabel(e.target.value); setPage(1); }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {DRIVER_CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Марка</label>
                <select
                  value={brandId}
                  onChange={(e) => {
                    maybeShowInstruction();
                    setBrandId(e.target.value);
                    setModelId("");
                    setPage(1);
                  }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  <option value="">Все</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Модель</label>
                <select
                  value={modelId}
                  onChange={(e) => { maybeShowInstruction(); setModelId(e.target.value); setPage(1); }}
                  disabled={!brandId || models.length === 0}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none disabled:bg-[#FAFAFA]"
                >
                  <option value="">Все</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-[12px] text-[#A1A1A1] mb-[6px]">Год</label>
                <select
                  value={year}
                  onChange={(e) => { maybeShowInstruction(); setYear(e.target.value); setPage(1); }}
                  className="w-full h-[49px] px-[14px] border border-[#EFEFEF] rounded-[10px] text-[14px] text-[#303030] bg-white focus:border-[#303030] outline-none"
                >
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Show button */}
              <div className="flex items-end col-span-2 md:col-span-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="w-full inline-flex items-center justify-center h-[49px] px-[20px] rounded-[10px] bg-[#F8D62E] text-[#303030] text-[14px] font-medium hover:bg-[#F8D62E]/90 transition-colors"
                >
                  Показать {filteredBySearch.length} шт
                </button>
              </div>
            </div>

            {/* District presets */}
            <div className="mt-[20px] flex flex-wrap gap-[8px]">
              {DISTRICT_PRESETS.map((preset) => {
                const isActive =
                  preset.key === "ALL"
                    ? selectedDistricts.length === 0
                    : preset.districts.length > 0 &&
                      preset.districts.every((d) => selectedDistricts.includes(d)) &&
                      selectedDistricts.length === preset.districts.length;
                return (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className={`inline-flex items-center h-[37px] px-[18px] rounded-[10px] text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-[#303030] text-white"
                        : "bg-[#F3F1E7] text-[#303030] hover:bg-[#F3F1E7]/70"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Districts */}
            <div className="mt-[10px] flex flex-wrap gap-[8px]">
              {DISTRICT_OPTIONS.map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => toggleDistrict(code)}
                  className={`inline-flex items-center h-[34px] px-[14px] rounded-[10px] text-[12px] font-medium border transition-colors ${
                    selectedDistricts.includes(code)
                      ? "bg-[#303030] text-white border-[#303030]"
                      : "bg-white text-[#303030] border-[#EFEFEF] hover:border-[#303030]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ RESULTS HEADER ══════ */}
        <div className="flex items-center justify-between mb-[20px]">
          <p className="text-[14px] text-[#A1A1A1]">
            Показано на странице:{" "}
            <span className="text-[#303030] font-medium">{filteredBySearch.length}</span>
          </p>
          {error && <span className="text-[14px] text-[#FA6868]">{error}</span>}
        </div>

        {/* ══════ PARKS LIST — styled park rows ══════ */}
        <section className="space-y-[12px] mb-[40px] md:mb-[60px]">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-[180px] rounded-[20px] bg-[#FAFAFA] animate-pulse" />
            ))
          ) : filteredBySearch.length === 0 ? (
            <div className="bg-white border border-[#EFEFEF] rounded-[20px] px-[30px] py-[80px] text-center">
              <div className="w-[64px] h-[64px] bg-[#F3F1E7] rounded-full mx-auto flex items-center justify-center mb-[16px]">
                <svg
                  className="w-[32px] h-[32px] text-[#A1A1A1]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 className="text-[18px] font-medium text-[#303030] mb-[6px]">Ничего не найдено</h3>
              <p className="text-[14px] text-[#A1A1A1] max-w-[420px] mx-auto mb-[20px]">
                Попробуйте изменить параметры фильтра — возможно, некоторые условия
                слишком строгие.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center h-[42px] px-[24px] rounded-[10px] border border-[#303030] text-[#303030] text-[13px] font-medium hover:bg-[#303030] hover:text-white transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            filteredBySearch.map((park) => {
              const rating = typeof park.rating === "string" ? parseFloat(park.rating) : park.rating;
              const commission = typeof park.parkCommission === "string" ? parseFloat(park.parkCommission) : park.parkCommission;
              const safeRating = isNaN(rating) ? 0 : rating;
              const safeCommission = isNaN(commission) ? 0 : commission;
              const displayName = park.nameHidden || !park.parkName ? "Название скрыто" : park.parkName;
              const isBusinessClass =
                park.driverClass === "BUSINESS" ||
                park.driverClass === "COMFORT_PLUS" ||
                park.driverClass === "PREMIER" ||
                park.driverClass === "ELITE";
              const hasAvailable = park.hasAvailableCars !== false;
              const advertised = Boolean(park.isAdvertised || park.isSuperAdvertised);

              return (
                <div
                  key={park.id}
                  className={`relative bg-white rounded-[20px] p-[24px] md:p-[30px] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                    advertised
                      ? "border-2 border-[#3BB560] ring-1 ring-[#3BB560]/20"
                      : "border border-[#EFEFEF]"
                  } ${!hasAvailable ? "opacity-60 grayscale" : ""}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-[20px] md:gap-[30px]">
                    {/* Rating block */}
                    <div className="flex items-center gap-[16px] md:w-[200px] shrink-0">
                      <span className="text-[40px] md:text-[56px] font-medium text-[#303030] leading-none tracking-[-0.02em]">
                        {safeRating.toFixed(2)}
                      </span>
                      <div className="flex flex-col gap-[4px]">
                        <div className="flex items-center gap-[1px]">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-[14px] h-[14px] ${i < Math.round(safeRating) ? "text-[#F8D62E]" : "text-[#E5E5E5]"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-[11px] text-[#A1A1A1]">рейтинг</span>
                      </div>
                    </div>

                    {/* Name and class */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[10px] flex-wrap mb-[6px]">
                        <h3 className="text-[18px] md:text-[22px] font-medium text-[#303030] truncate">
                          {displayName}
                        </h3>
                        <Badge variant={isBusinessClass ? "yellow" : "gray"}>
                          {classLabel(park.driverClass)}
                        </Badge>
                        {advertised && <Badge variant="green">Рекомендуем</Badge>}
                      </div>
                      <div className="flex gap-[20px] md:gap-[30px] text-[13px]">
                        <div>
                          <p className="text-[#A1A1A1]">Залог</p>
                          <p className="font-medium text-[#303030]">
                            {park.deposit.toLocaleString("ru-RU")} руб.
                          </p>
                        </div>
                        <div>
                          <p className="text-[#A1A1A1]">Комиссия</p>
                          <p className="font-medium text-[#303030]">{safeCommission}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-[10px] shrink-0">
                      <Link
                        href={`/parks/${park.id}`}
                        className="inline-flex items-center justify-center h-[42px] px-[24px] rounded-[10px] border border-[#303030] text-[#303030] text-[13px] font-medium hover:bg-[#303030] hover:text-white transition-colors"
                      >
                        Подробнее
                      </Link>
                    </div>
                  </div>

                  {!hasAvailable && (
                    <div className="mt-[16px] inline-flex items-center gap-[6px] h-[30px] px-[12px] rounded-[10px] bg-[#FAFAFA] text-[#A1A1A1] text-[12px] font-medium">
                      <svg
                        className="w-[14px] h-[14px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Нет свободных машин
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* ══════ PAGINATION ══════ */}
        {(page > 1 || hasNextPage) && !loading && (
          <nav className="flex items-center justify-center gap-[12px] mb-[40px] md:mb-[60px]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center justify-center h-[42px] px-[20px] rounded-[10px] border border-[#EFEFEF] text-[#303030] text-[13px] font-medium hover:border-[#303030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Назад
            </button>
            <span className="text-[13px] text-[#303030]">Стр. {page}</span>
            <button
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center justify-center h-[42px] px-[20px] rounded-[10px] border border-[#EFEFEF] text-[#303030] text-[13px] font-medium hover:border-[#303030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Далее
            </button>
          </nav>
        )}
      </div>

      {/* ══════ FEATURES GRID (yellow+dark duo) ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-[24px] md:px-[100px] pb-[60px] md:pb-[100px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <div className="bg-[#F8D62E] text-[#303030] rounded-[20px] p-[30px] md:p-[50px] h-[320px] md:h-[442px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-[22px] md:text-[34px] font-semibold leading-[1.12] tracking-[-0.01em]">
                  Получите заказ «По&nbsp;делам»
                  <br />в&nbsp;любом месте за&nbsp;2&nbsp;мин, без&nbsp;9%
                </h3>
                <p className="mt-[20px] text-[13px] md:text-[14px] leading-[22px] text-[#303030]/70">
                  Сервис подачи заказов для водителей такси без комиссии агрегатора.
                </p>
              </div>
              <Link
                href="/no9"
                className="absolute bottom-[30px] md:bottom-[50px] left-[30px] md:left-[50px] inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-[#303030] text-white text-[14px] font-medium hover:bg-[#404040] transition-colors z-10"
              >
                Заказать
              </Link>
              <Image
                src="/figma/feature-no9.png"
                alt=""
                width={640}
                height={640}
                className="absolute bottom-0 right-0 w-[180px] md:w-[340px] h-auto object-contain pointer-events-none select-none"
              />
            </div>
            <div className="bg-[#303030] text-white rounded-[20px] p-[30px] md:p-[50px] h-[320px] md:h-[442px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-[22px] md:text-[34px] font-semibold leading-[1.12] tracking-[-0.01em]">
                  Выкуп
                  <br />
                  автомобилей
                </h3>
                <p className="mt-[20px] text-[13px] md:text-[14px] leading-[22px] text-white/70">
                  Подберём автомобиль для работы в такси с выгодными условиями выкупа.
                </p>
              </div>
              <Link
                href="/buyout"
                className="absolute bottom-[30px] md:bottom-[50px] left-[30px] md:left-[50px] inline-flex items-center justify-center h-[49px] px-[40px] rounded-[10px] bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-colors z-10"
              >
                Посмотреть авто
              </Link>
              <Image
                src="/figma/feature-buyout.png"
                alt=""
                width={640}
                height={640}
                className="absolute bottom-0 right-0 w-[180px] md:w-[340px] h-auto object-contain pointer-events-none select-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════ FILTER INSTRUCTION MODAL ══════ */}
      {instructionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setInstructionOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] w-full max-w-[440px] p-[24px] md:p-[32px]">
            <h3 className="text-[18px] font-medium text-[#303030] mb-[12px]">
              Как фильтры влияют на сортировку
            </h3>
            <p className="text-[13px] text-[#A1A1A1] leading-[22px] mb-[20px]">
              Если ищете лучшие условия по конкретной марке или модели авто —
              выбирайте соответствующие фильтры. Сортировка покажет сначала
              таксопарки с лучшими условиями именно по выбранному автомобилю.
              Иначе отображаются таксопарки с лучшими средними условиями по классу.
            </p>
            <label className="flex items-center gap-[8px] mb-[20px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-[16px] h-[16px] accent-[#F8D62E]"
              />
              <span className="text-[12px] text-[#A1A1A1]">Больше не показывать</span>
            </label>
            <button
              onClick={dismissInstruction}
              className="w-full inline-flex items-center justify-center h-[49px] rounded-[10px] bg-[#303030] text-white text-[14px] font-medium hover:bg-[#404040] transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
}
