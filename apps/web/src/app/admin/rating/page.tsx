"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

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
  const [config, setConfig] = useState<Config | null>(null);
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
    <div className="max-w-[900px]">
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <h1 className="text-xl font-medium text-[#303030] mb-6">Настройки рейтинга</h1>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1]">Загрузка...</p>
      ) : (
        <div className="space-y-6">
          {/* Config */}
          <section className="bg-white border border-[#E5E5E5] rounded-xl p-5">
            <h2 className="text-sm font-medium text-[#303030] mb-2">Коэффициенты (должны в сумме давать 1.0)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#A1A1A1] mb-1">Коэфф. цены</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={priceCoef}
                  onChange={(e) => setPriceCoef(e.target.value)}
                  className="w-full h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A1A1] mb-1">Коэфф. параметров</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={paramsCoef}
                  onChange={(e) => setParamsCoef(e.target.value)}
                  className="w-full h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
                />
              </div>
            </div>

            <h3 className="text-xs text-[#A1A1A1] mt-5 mb-2">Комиссии Яндекс-агрегатора</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#A1A1A1] mb-1">Комиссия Яндекса (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={yandexComm}
                  onChange={(e) => setYandexComm(e.target.value)}
                  className="w-full h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A1A1] mb-1">Комиссия Яндекса эконом (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={yandexCommEconomy}
                  onChange={(e) => setYandexCommEconomy(e.target.value)}
                  className="w-full h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
                />
              </div>
            </div>

            <Button size="sm" className="mt-3" onClick={saveConfig}>Сохранить коэффициенты</Button>
          </section>

          {/* Weights */}
          <section className="bg-white border border-[#E5E5E5] rounded-xl p-5">
            <h2 className="text-sm font-medium text-[#303030] mb-3">Веса параметров (20 шт.)</h2>
            <p className="text-[11px] text-[#A1A1A1] mb-3">
              «Макс. промодней в классе» — вспомогательное значение, не учитывается в рейтинге.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weights.filter((w) => w.paramName !== "maxPromoDaysInClass").map((w) => (
                <div
                  key={w.paramName}
                  className="flex items-center justify-between gap-3 border border-[#E5E5E5] rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-[#303030]">
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
                    className="h-[32px] px-2 border border-[#E5E5E5] rounded-lg text-xs bg-white"
                  >
                    {WEIGHT_OPTIONS.map((o) => (
                      <option key={o} value={o}>{WEIGHT_LABEL[o]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={saveWeights}>Сохранить веса</Button>
          </section>

          {/* Revenue */}
          <section className="bg-white border border-[#E5E5E5] rounded-xl p-5">
            <h2 className="text-sm font-medium text-[#303030] mb-3">Доходность по классам (₽/день)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {revenue.map((r) => (
                <div key={r.driverClass}>
                  <label className="block text-xs text-[#A1A1A1] mb-1">
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
                    className="w-full h-[40px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={saveRevenue}>Сохранить доходность</Button>
          </section>

          {/* Recalculate */}
          <section className="bg-white border border-[#E5E5E5] rounded-xl p-5">
            <h2 className="text-sm font-medium text-[#303030] mb-2">Пересчёт рейтингов</h2>
            <p className="text-xs text-[#A1A1A1] mb-3">
              Рейтинги пересчитываются автоматически при изменении настроек. Кнопка ниже
              принудительно запускает полный пересчёт.
            </p>
            <Button size="sm" onClick={recalcAll}>Пересчитать все рейтинги</Button>
          </section>
        </div>
      )}
    </div>
  );
}
