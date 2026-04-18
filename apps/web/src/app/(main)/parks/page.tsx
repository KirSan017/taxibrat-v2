"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ParkCard, type ParkCardData } from "@/components/parks/park-card";
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

// Pseudo-presets that apply a district bundle.
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

  // Load brands once
  useEffect(() => {
    api<ApiBrand[]>("/catalog/brands")
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, []);

  // Load honor board and public stats
  useEffect(() => {
    api<HonorBoardItem[]>("/public/honor-board")
      .then((data) => setHonorBoard(Array.isArray(data) ? data : []))
      .catch(() => setHonorBoard([]));
    api<PublicStats>("/public/stats")
      .then((data) => setPublicStats(data))
      .catch(() => setPublicStats(null));
  }, []);

  // Load models when brand changes
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

  // Load parks on filter / page change
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
      // Fall back to local filter
    }
  };

  const filteredBySearch = searchQuery.trim()
    ? parks.filter((p) =>
        (p.parkName ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : parks;

  const toCardData = (p: ApiParkClass): ParkCardData => {
    const rating = typeof p.rating === "string" ? parseFloat(p.rating) : p.rating;
    const commission = typeof p.parkCommission === "string" ? parseFloat(p.parkCommission) : p.parkCommission;
    return {
      id: p.id as unknown as number, // ParkCardData types id as number but routes accept strings
      name: p.parkName ?? "",
      hidden: Boolean(p.nameHidden),
      driverClass: DRIVER_CLASS_LABELS[p.driverClass] ?? p.driverClass,
      rating: isNaN(rating) ? 0 : rating,
      rent: 0, // not returned by list endpoint; shown as 0 for now
      deposit: p.deposit,
      commission: isNaN(commission) ? 0 : commission,
      advertised: Boolean(p.isAdvertised || p.isSuperAdvertised),
      hasAvailableCars: p.hasAvailableCars,
    };
  };

  // Per task: pagination using real `total` from response.
  // Current API returns bare array (no total); use length heuristic for next-page availability.
  const hasNextPage = parks.length === LIMIT;

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
            {/* Left — headline + stats */}
            <div>
              <h1 className="text-3xl md:text-[48px] font-medium text-[#303030] leading-tight">
                Рейтинг таксопарков
                <br />
                <span className="text-[#F8D62E]">№1</span> в Москве
              </h1>

              <div className="mt-6 flex flex-wrap items-start gap-8">
                <div className="flex items-start gap-4">
                  <span className="text-[56px] md:text-[78px] font-medium leading-none text-[#F8D62E]">
                    {publicStats?.parks ?? 148}
                  </span>
                  <p className="mt-2 text-sm font-medium text-[#303030]">
                    Таксопарков
                    <br />
                    проверено
                  </p>
                </div>

                <div className="bg-[#F8D62E] rounded-xl px-6 py-3">
                  <span className="text-2xl md:text-3xl font-medium text-[#303030]">
                    {publicStats ? `${publicStats.users}+` : "615+"}
                  </span>
                  <span className="ml-2 text-xs text-[#303030]/70">пользователей</span>
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

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* ══════ HONOR BOARD ══════ */}
        {honorBoard.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-medium text-[#303030] mb-4">Доска почёта</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {honorBoard.map((hb, idx) => (
                <div
                  key={hb.id}
                  className="flex-none flex items-center gap-3 bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 min-w-[200px]"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F3F1E7] flex items-center justify-center text-sm font-medium text-[#303030] shrink-0">
                    {hb.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#303030] truncate">{hb.name}</p>
                    <p className="text-xs text-[#A1A1A1]">{hb.checks} проверок</p>
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

        {/* ══════ FILTERS ══════ */}
        <section className="mb-8">
          <h2 className="text-lg font-medium text-[#303030] mb-4">Выберите параметры и найдите таксопарк</h2>

          {/* Search by name */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по названию парка..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">Найти</Button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Driver class */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Класс водителя</label>
              <select
                value={driverClassLabel}
                onChange={(e) => { maybeShowInstruction(); setDriverClassLabel(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {DRIVER_CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Марка</label>
              <select
                value={brandId}
                onChange={(e) => {
                  maybeShowInstruction();
                  setBrandId(e.target.value);
                  setModelId("");
                  setPage(1);
                }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                <option value="">Все</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Модель</label>
              <select
                value={modelId}
                onChange={(e) => { maybeShowInstruction(); setModelId(e.target.value); setPage(1); }}
                disabled={!brandId || models.length === 0}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none disabled:bg-gray-50"
              >
                <option value="">Все</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs text-[#A1A1A1] mb-1">Год</label>
              <select
                value={year}
                onChange={(e) => { maybeShowInstruction(); setYear(e.target.value); setPage(1); }}
                className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white focus:border-[#303030] outline-none"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Show button */}
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button size="sm" className="w-full" onClick={() => setPage(1)}>
                Показать {filteredBySearch.length} шт
              </Button>
            </div>
          </div>

          {/* District presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            {DISTRICT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  preset.key === "ALL" && selectedDistricts.length === 0
                    ? "bg-[#303030] text-white border-[#303030]"
                    : preset.districts.length > 0 &&
                      preset.districts.every((d) => selectedDistricts.includes(d)) &&
                      selectedDistricts.length === preset.districts.length
                    ? "bg-[#303030] text-white border-[#303030]"
                    : "bg-[#F3F1E7] text-[#303030] border-[#F3F1E7] hover:border-[#303030]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Districts */}
          <div className="mt-3 flex flex-wrap gap-2">
            {DISTRICT_OPTIONS.map(([code, label]) => (
              <button
                key={code}
                onClick={() => toggleDistrict(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDistricts.includes(code)
                    ? "bg-[#303030] text-white border-[#303030]"
                    : "bg-white text-[#303030] border-[#E5E5E5] hover:border-[#303030]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ══════ RESULTS HEADER ══════ */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#A1A1A1]">
            Показано на странице: <span className="text-[#303030] font-medium">{filteredBySearch.length}</span>
          </p>
          {error && <span className="text-sm text-[#FA6868]">{error}</span>}
        </div>

        {/* ══════ PARKS LIST ══════ */}
        <section className="space-y-4 mb-8">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-[180px] rounded-xl bg-gray-100 animate-pulse" />
            ))
          ) : filteredBySearch.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl px-6 py-16 text-center">
              <div className="w-16 h-16 bg-[#FAFAFA] rounded-full mx-auto flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#A1A1A1]"
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
              <h3 className="text-base font-medium text-[#303030] mb-1">Ничего не найдено</h3>
              <p className="text-sm text-[#A1A1A1] max-w-sm mx-auto mb-5">
                Попробуйте изменить параметры фильтра — возможно, некоторые условия
                слишком строгие.
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            filteredBySearch.map((park) => (
              <ParkCard key={park.id} park={toCardData(park)} />
            ))
          )}
        </section>

        {/* ══════ PAGINATION ══════ */}
        {(page > 1 || hasNextPage) && !loading && (
          <nav className="flex items-center justify-center gap-3 mb-12">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <span className="text-sm text-[#303030]">Стр. {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </nav>
        )}
      </div>

      {/* ══════ FEATURES GRID (same as home) ══════ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-6 pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8D62E] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-xl md:text-2xl font-medium leading-snug">
                  Получите заказ «По делам»<br />в любом месте за 2 мин,<br />без 9%
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[#303030]/70">
                  Сервис подачи заказов для водителей такси без комиссии агрегатора.
                </p>
              </div>
              <Image src="/figma/feature-no9.png" alt="" width={320} height={320} className="absolute bottom-0 right-0 w-[140px] md:w-[180px] h-auto object-contain pointer-events-none select-none" />
            </div>
            <div className="bg-[#303030] text-white rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-xl md:text-2xl font-medium leading-snug">
                  Выкуп<br />автомобилей
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Подберём автомобиль для работы в такси с выгодными условиями выкупа.
                </p>
              </div>
              <Image src="/figma/feature-buyout.png" alt="" width={320} height={320} className="absolute bottom-0 right-0 w-[140px] md:w-[180px] h-auto object-contain pointer-events-none select-none" />
            </div>
            <div className="bg-white border border-[#E5E5E5] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-xl md:text-2xl font-medium leading-snug">
                  Проверка по базе<br />таксопарков
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[#A1A1A1]">
                  Узнайте реальные условия парка до подключения.
                </p>
              </div>
              <Image src="/figma/feature-check.png" alt="" width={320} height={320} className="absolute bottom-0 right-0 w-[140px] md:w-[180px] h-auto object-contain pointer-events-none select-none" />
            </div>
            <div className="bg-white border border-[#E5E5E5] text-[#303030] rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <h3 className="text-xl md:text-2xl font-medium leading-snug">
                  Подключим<br />вас к такси
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[#A1A1A1]">
                  Поможем выбрать лучший таксопарк под ваши параметры.
                </p>
              </div>
              <Image src="/figma/feature-connect.png" alt="" width={320} height={320} className="absolute bottom-0 right-0 w-[140px] md:w-[180px] h-auto object-contain pointer-events-none select-none" />
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
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 md:p-8">
            <h3 className="text-lg font-medium text-[#303030] mb-3">
              Как фильтры влияют на сортировку
            </h3>
            <p className="text-sm text-[#A1A1A1] leading-relaxed mb-5">
              Если ищете лучшие условия по конкретной марке или модели авто —
              выбирайте соответствующие фильтры. Сортировка покажет сначала
              таксопарки с лучшими условиями именно по выбранному автомобилю.
              Иначе отображаются таксопарки с лучшими средними условиями по классу.
            </p>
            <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 accent-[#F8D62E]"
              />
              <span className="text-xs text-[#A1A1A1]">Больше не показывать</span>
            </label>
            <Button className="w-full" onClick={dismissInstruction}>
              Понятно
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
