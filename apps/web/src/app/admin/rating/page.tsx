"use client";

import { useEffect, useState } from "react";
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
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

type WeightLevel = "LOW" | "MEDIUM" | "HIGH";

interface Weight {
  paramName: string;
  weight: WeightLevel;
  label?: string | null;
}

interface Config {
  id: string;
  priceCoefficient: string;
  paramsCoefficient: string;
  yandexCommission?: string;
  yandexCommissionEconomy?: string;
}

interface Revenue {
  driverClass: string;
  dailyRevenue: number;
}

const CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Эконом",
  COMFORT: "Комфорт",
  COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес",
  PREMIER: "Премьер",
  ELITE: "Элит",
};

const PARAM_LABELS: Record<string, string> = {
  parkCommission: "Комиссия парка",
  withdrawalCommission: "Комиссия на вывод",
  transferCommission: "Комиссия перевода",
  deposit: "Депозит",
  depositReturnDays: "Возврат депозита (дней)",
  latePenalty: "Штраф за просрочку",
  trafficFinePenalty: "Штраф за ДТП/штрафы ГИБДД",
  terminationDays: "Срок расторжения",
  contractFairness: "Честность договора",
  contractMatch: "Соответствие договора реальности",
  daysOff: "Выходные",
  newDriverPromoDays: "Промодни новичкам",
  replacementCar: "Подменное авто",
  insurance: "Страхование",
  inspectionFreq: "Периодичность осмотров",
  maintenanceDay: "День ТО",
  extraScratch: "Царапины",
  repairDowntime: "Простой на ремонте",
  selfRepair: "Самостоятельный ремонт",
  repairPricing: "Прайс на ремонт",
};

const WEIGHT_OPTIONS: WeightLevel[] = ["LOW", "MEDIUM", "HIGH"];
const WEIGHT_LABEL: Record<WeightLevel, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};

/* ── page ────────────────────────────────────────────── */

export default function AdminRatingPage() {
  const { user } = useAuth();
  const [weights, setWeights] = useState<Weight[]>([]);
  const [, setConfig] = useState<Config | null>(null);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [priceCoef, setPriceCoef] = useState("0.6");
  const [paramsCoef, setParamsCoef] = useState("0.4");
  const [yandexComm, setYandexComm] = useState("0");
  const [yandexCommEconomy, setYandexCommEconomy] = useState("0");
  const [weightEdits, setWeightEdits] = useState<Record<string, WeightLevel>>({});
  const [revenueEdits, setRevenueEdits] = useState<Record<string, number>>({});

  const loadAll = async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [ws, cfg, rv] = await Promise.all([
        api<Weight[]>("/admin/rating/weights", { token }),
        api<Config>("/admin/rating/config", { token }),
        api<Revenue[]>("/admin/rating/revenue", { token }),
      ]);
      setWeights(Array.isArray(ws) ? ws : []);
      setConfig(cfg);
      setRevenue(Array.isArray(rv) ? rv : []);
      if (cfg) {
        setPriceCoef(cfg.priceCoefficient);
        setParamsCoef(cfg.paramsCoefficient);
        setYandexComm(cfg.yandexCommission ?? "0");
        setYandexCommEconomy(cfg.yandexCommissionEconomy ?? "0");
      }
      const wMap: Record<string, WeightLevel> = {};
      (Array.isArray(ws) ? ws : []).forEach((w) => {
        wMap[w.paramName] = w.weight;
      });
      setWeightEdits(wMap);
      const rMap: Record<string, number> = {};
      (Array.isArray(rv) ? rv : []).forEach((r) => {
        rMap[r.driverClass] = Number(r.dailyRevenue);
      });
      setRevenueEdits(rMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveWeights = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const updates = Object.entries(weightEdits).map(([paramName, weight]) => ({
        paramName,
        weight,
      }));
      await api("/admin/rating/weights", { method: "PATCH", token, body: updates });
      setSuccessMsg("Веса обновлены. Рейтинги пересчитаны.");
      loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить веса");
    }
  };

  const saveConfig = async () => {
    const token = getAccessToken();
    if (!token) return;
    const a = parseFloat(priceCoef);
    const b = parseFloat(paramsCoef);
    if (!isFinite(a) || !isFinite(b)) {
      setError("Введите корректные числа");
      return;
    }
    if (Math.abs(a + b - 1) > 0.001) {
      setError("Сумма коэффициентов должна быть ровно 1.0");
      return;
    }
    const yc = parseFloat(yandexComm);
    const yce = parseFloat(yandexCommEconomy);
    if (!isFinite(yc) || yc < 0 || yc > 100) {
      setError("Комиссия Яндекса должна быть в диапазоне 0–100");
      return;
    }
    if (!isFinite(yce) || yce < 0 || yce > 100) {
      setError("Комиссия Яндекса эконом должна быть в диапазоне 0–100");
      return;
    }
    try {
      await api("/admin/rating/config", {
        method: "PATCH",
        token,
        body: {
          priceCoefficient: priceCoef,
          paramsCoefficient: paramsCoef,
          yandexCommission: yandexComm,
          yandexCommissionEconomy: yandexCommEconomy,
        },
      });
      setSuccessMsg("Коэффициенты обновлены. Рейтинги пересчитаны.");
      loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить конфиг");
    }
  };

  const saveRevenue = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const updates = Object.entries(revenueEdits).map(([driverClass, dailyRevenue]) => ({
        driverClass,
        dailyRevenue,
      }));
      await api("/admin/rating/revenue", { method: "PATCH", token, body: updates });
      setSuccessMsg("Доходность классов обновлена. Рейтинги пересчитаны.");
      loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить доходность");
    }
  };

  const recalcAll = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api("/admin/rating/recalculate", { method: "POST", token });
      setSuccessMsg("Все рейтинги пересчитаны вручную");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось пересчитать");
    }
  };

  if (user && user.role !== "ADMIN") {
    return <p className="text-sm text-[#FA6868]">Доступно только администратору</p>;
  }

  return (
    <div>
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">
            Алгоритм
          </p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>Настройки рейтинга</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Коэффициенты, веса параметров и доходность классов
          </p>
        </div>
        <button type="button" onClick={recalcAll} className={ADMIN_PRIMARY_BTN}>
          Пересчитать рейтинги
        </button>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
      ) : (
        <div className="space-y-5">
          {/* ── Coefficients ── */}
          <section className={`${ADMIN_CARD} p-5 md:p-6`}>
            <div className="mb-4">
              <h2 className={ADMIN_SECTION_TITLE}>Коэффициенты</h2>
              <p className="text-xs text-[#A1A1A1] mt-1">
                Сумма коэффициентов цены и параметров должна быть ровно 1.0
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Коэфф. цены
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={priceCoef}
                  onChange={(e) => setPriceCoef(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Коэфф. параметров
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={paramsCoef}
                  onChange={(e) => setParamsCoef(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-[#1F1F1F] mt-6 mb-4">
              Комиссии Яндекс-агрегатора
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Комиссия Яндекса (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={yandexComm}
                  onChange={(e) => setYandexComm(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Комиссия Яндекса эконом (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={yandexCommEconomy}
                  onChange={(e) => setYandexCommEconomy(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </div>
            </div>
            <div className="mt-5">
              <button type="button" onClick={saveConfig} className={ADMIN_OUTLINE_BTN}>
                Сохранить коэффициенты
              </button>
            </div>
          </section>

          {/* ── Revenue ── */}
          <section className={`${ADMIN_CARD} p-5 md:p-6`}>
            <div className="mb-4">
              <h2 className={ADMIN_SECTION_TITLE}>Доходность по классам</h2>
              <p className="text-xs text-[#A1A1A1] mt-1">
                Средний дневной заработок по тарифам, ₽/день
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {revenue.map((r) => (
                <div key={r.driverClass}>
                  <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                    {CLASS_LABELS[r.driverClass] || r.driverClass}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={revenueEdits[r.driverClass] ?? r.dailyRevenue}
                    onChange={(e) =>
                      setRevenueEdits((prev) => ({
                        ...prev,
                        [r.driverClass]: Number(e.target.value),
                      }))
                    }
                    className={ADMIN_INPUT}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5">
              <button type="button" onClick={saveRevenue} className={ADMIN_OUTLINE_BTN}>
                Сохранить доходность
              </button>
            </div>
          </section>

          {/* ── Weights ── */}
          <section className={`${ADMIN_CARD} p-5 md:p-6`}>
            <div className="mb-4">
              <h2 className={ADMIN_SECTION_TITLE}>Веса параметров</h2>
              <p className="text-xs text-[#A1A1A1] mt-1">
                Влияние каждого параметра на итоговый рейтинг класса
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weights
                .filter((w) => w.paramName !== "maxPromoDaysInClass")
                .map((w) => (
                  <div
                    key={w.paramName}
                    className="flex items-center justify-between gap-3 border border-[#EFEFEF] rounded-[12px] px-4 py-2.5 hover:border-[#E5E5E5] transition-colors"
                  >
                    <span className="text-sm text-[#1F1F1F] truncate">
                      {PARAM_LABELS[w.paramName] || w.paramName}
                    </span>
                    <select
                      value={weightEdits[w.paramName] || w.weight}
                      onChange={(e) =>
                        setWeightEdits((prev) => ({
                          ...prev,
                          [w.paramName]: e.target.value as WeightLevel,
                        }))
                      }
                      className={`${ADMIN_SELECT} h-[36px] w-[130px] text-xs`}
                    >
                      {WEIGHT_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {WEIGHT_LABEL[o]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
            <div className="mt-5">
              <button type="button" onClick={saveWeights} className={ADMIN_OUTLINE_BTN}>
                Сохранить веса
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
