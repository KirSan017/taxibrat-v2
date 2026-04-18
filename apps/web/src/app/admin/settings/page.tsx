"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Setting {
  key: string;
  value: string;
}

/* ── labels & groups ──────────────────────────────────── */

const SETTING_LABELS: Record<string, string> = {
  points_registration: "Баллы за регистрацию",
  points_park_check: "Баллы за проверку парка",
  points_park_add: "Баллы за добавление парка",
  points_taxi_connect: "Баллы за подключение к такси",
  points_rental_confirmed: "Баллы за подтверждение факта аренды",
  points_buyout: "Баллы за выкуп авто",
  points_idea: "Баллы за идею",
  points_referral_register: "Реферальный бонус (пригласивший)",
  points_referral_bonus: "Реферальный бонус (приглашённый)",
  points_referral_rental: "Реферальный бонус за аренду друга",
  points_referral_buyout: "Реферальный бонус за выкуп друга",
  points_base_check_cost: "Стоимость проверки по базе",
  points_order_no9_cost: "Стоимость заказа «По делам»",
  points_order_cancel_cost: "Стоимость отмены заказа",
  no9_enabled: "Сервис «По делам» включён (админ)",
  no9_auto_disabled: "Сервис «По делам» автоматически отключён системой",
  banner_url: "URL рекламного баннера",
  points_review_enabled: "Блок о пересмотре баллов на главной",
  points_review_date: "Дата следующего пересмотра баллов",
};

interface Group {
  title: string;
  keys: string[];
}

const GROUPS: Group[] = [
  {
    title: "Баллы — начисление",
    keys: [
      "points_registration",
      "points_park_check",
      "points_park_add",
      "points_taxi_connect",
      "points_rental_confirmed",
      "points_buyout",
      "points_idea",
      "points_referral_register",
      "points_referral_bonus",
      "points_referral_rental",
      "points_referral_buyout",
    ],
  },
  {
    title: "Стоимости",
    keys: [
      "points_base_check_cost",
      "points_order_no9_cost",
      "points_order_cancel_cost",
    ],
  },
  {
    title: "Функции",
    keys: ["no9_enabled", "no9_auto_disabled", "points_review_enabled", "points_review_date"],
  },
  {
    title: "Реклама",
    keys: ["banner_url"],
  },
];

const BOOLEAN_KEYS = new Set(["no9_enabled", "no9_auto_disabled", "points_review_enabled"]);

/* ── page ─────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const loadSettings = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<Setting[] | { data: Setting[] }>("/admin/settings", { token })
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setSettings(list);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const byKey = useMemo(() => {
    const m = new Map<string, Setting>();
    for (const s of settings) m.set(s.key, s);
    return m;
  }, [settings]);

  const updateField = (key: string, value: string) => {
    setSettings((prev) => {
      if (prev.some((s) => s.key === key)) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value }];
    });
  };

  const handleSave = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await api("/admin/settings", {
        method: "PATCH",
        token,
        body: { updates: settings.map((s) => ({ key: s.key, value: s.value })) },
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  // Keys present in DB but not covered by any group: show as "Other"
  const groupedKeys = new Set(GROUPS.flatMap((g) => g.keys));
  const otherKeys = settings.filter((s) => !groupedKeys.has(s.key)).map((s) => s.key);

  const renderField = (key: string) => {
    const setting = byKey.get(key);
    const value = setting?.value ?? "";
    const label = SETTING_LABELS[key] ?? key;
    const isBool = BOOLEAN_KEYS.has(key);

    return (
      <div key={key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 border-b border-[#E5E5E5] last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#303030]">{label}</p>
          <p className="text-[11px] text-[#A1A1A1] mt-0.5 break-all">{key}</p>
        </div>
        <div className="w-full md:w-[260px] shrink-0">
          {isBool ? (
            <select
              value={value === "true" ? "true" : "false"}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full h-[42px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] bg-white outline-none focus:border-[#303030]"
            >
              <option value="true">Включено</option>
              <option value="false">Выключено</option>
            </select>
          ) : (
            <Input value={value} onChange={(e) => updateField(key, e.target.value)} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Сохранено"
        description="Настройки успешно обновлены"
      />

      <h1 className="text-xl font-medium text-[#303030] mb-1">Настройки сервиса</h1>
      <p className="text-sm text-[#A1A1A1] mb-6">
        Управление баллами дружбы, стоимостями и рекламными материалами
      </p>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : (
        <>
          {GROUPS.map((group) => (
            <section key={group.title} className="bg-white border border-[#E5E5E5] rounded-xl p-5 md:p-6 mb-4">
              <h2 className="text-sm font-medium text-[#303030] mb-3">{group.title}</h2>
              <div>{group.keys.map(renderField)}</div>
            </section>
          ))}
          {otherKeys.length > 0 && (
            <section className="bg-white border border-[#E5E5E5] rounded-xl p-5 md:p-6 mb-4">
              <h2 className="text-sm font-medium text-[#303030] mb-3">Прочие</h2>
              <div>{otherKeys.map(renderField)}</div>
            </section>
          )}
          <div className="mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
