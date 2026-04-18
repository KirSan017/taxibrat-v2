"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/ui/address-input";
import { Badge } from "@/components/ui/badge";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Park {
  id: string;
  name: string;
  status: string;
  city?: string | null;
  description?: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  rating?: number | null;
  isAdvertised?: boolean;
  createdAt: string;
}

interface ParkClass {
  id: string;
  driverClass: string;
  name?: string | null;
  // 18 parameters from schema
  parkCommission?: string | number | null;
  withdrawalCommission?: string | number | null;
  transferCommission?: string | number | null;
  deposit?: number | null;
  depositReturnDays?: number | null;
  latePenalty?: number | null;
  trafficFinePenalty?: number | null;
  terminationDays?: number | null;
  contractFairness?: number | null;
  contractMatch?: number | null;
  daysOff?: number | null;
  newDriverPromoDays?: string | number | null;
  maxPromoDaysInClass?: string | number | null;
  replacementCar?: number | null;
  insurance?: number | null;
  inspectionFreq?: number | null;
  maintenanceDay?: number | null;
  extraScratch?: number | null;
  repairDowntime?: number | null;
  selfRepair?: number | null;
  repairPricing?: number | null;
  rating?: string | number | null;
  paramsRating?: string | number | null;
}

const CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Эконом",
  COMFORT: "Комфорт",
  COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес",
  PREMIER: "Премьер",
  ELITE: "Элит",
};

interface Vehicle {
  id: string;
  year: number;
  licensePlate?: string | null;
  brandName?: string | null;
  modelName?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminParkEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const parkId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [park, setPark] = useState<Park | null>(null);
  const [classes, setClasses] = useState<ParkClass[]>([]);
  const [vehiclesByClass, setVehiclesByClass] = useState<Record<string, Vehicle[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    city: "",
    description: "",
    workingHours: "",
    address: "",
    phone: "",
    email: "",
    isAdvertised: false,
  });

  const loadData = async () => {
    if (!parkId || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const parkData = await api<Park>(`/admin/parks/${parkId}`, { token });
      setPark(parkData);
      setForm({
        name: parkData.name || "",
        city: parkData.city || "",
        description: parkData.description || "",
        workingHours: parkData.workingHours || "",
        address: parkData.address || "",
        phone: parkData.phone || "",
        email: parkData.email || "",
        isAdvertised: !!parkData.isAdvertised,
      });

      try {
        const classesData = await api<ParkClass[]>(`/admin/parks/${parkId}/classes`, { token });
        setClasses(Array.isArray(classesData) ? classesData : []);

        const vehiclesMap: Record<string, Vehicle[]> = {};
        for (const cls of classesData || []) {
          try {
            const vs = await api<Vehicle[]>(`/admin/parks/${parkId}/classes/${cls.id}/vehicles`, { token });
            vehiclesMap[cls.id] = Array.isArray(vs) ? vs : [];
          } catch {
            vehiclesMap[cls.id] = [];
          }
        }
        setVehiclesByClass(vehiclesMap);
      } catch {
        setClasses([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkId, user]);

  const handleSave = async () => {
    if (!parkId) return;
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await api(`/admin/parks/${parkId}`, {
        method: "PATCH",
        token,
        body: {
          name: form.name,
          city: form.city || undefined,
          description: form.description || undefined,
          workingHours: form.workingHours || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          isAdvertised: form.isAdvertised,
        },
      });
      setSuccessMsg("Таксопарк сохранён");
      setSuccessOpen(true);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!parkId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${parkId}`, {
        method: "PATCH",
        token,
        body: { status: "ACTIVE" },
      });
      setSuccessMsg("Таксопарк одобрен и активирован");
      setSuccessOpen(true);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить");
    }
  };

  const handleReject = async (reason: string) => {
    if (!parkId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${parkId}`, {
        method: "PATCH",
        token,
        body: { status: "ARCHIVED", rejectionReason: reason },
      });
      setSuccessMsg("Таксопарк отклонён");
      setSuccessOpen(true);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить");
    }
  };

  if (loading && !park) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error && !park) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error}</p>
        <Link href="/admin/parks" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку таксопарков
        </Link>
      </div>
    );
  }

  if (!park) return null;

  const status = STATUS_CONFIG[park.status] || { label: park.status, variant: "gray" as const };
  const canModerate = user?.role === "ADMIN" || user?.role === "SUPER_MANAGER" || user?.role === "MANAGER";

  return (
    <div className="max-w-[900px]">
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        title="Отклонить таксопарк"
        description="Укажите причину отклонения."
      />
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Готово"
        description={successMsg}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/parks" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К списку
          </Link>
          <h1 className="text-2xl font-medium text-[#303030] mt-1">{park.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {park.isAdvertised && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F8D62E] text-[#303030]">
                Реклама
              </span>
            )}
          </div>
        </div>

        {canModerate && (
          <div className="flex gap-2">
            {park.status === "DRAFT" && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FA6868] text-[#FA6868]"
                  onClick={() => setRejectOpen(true)}
                >
                  Отклонить
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* Basic info */}
      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 mb-4">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Основные данные</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Название*"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Город"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
          <AddressInput
            label="Адрес"
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />
          <Input
            label="Часы работы"
            value={form.workingHours}
            onChange={(e) => setForm((p) => ({ ...p, workingHours: e.target.value }))}
          />
          <Input
            label="Телефон"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-[#303030] mb-1.5">Описание</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] resize-none transition-colors"
          />
        </div>

        {user?.role === "ADMIN" && (
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={form.isAdvertised}
              onChange={(e) => setForm((p) => ({ ...p, isAdvertised: e.target.checked }))}
            />
            <span className="text-sm text-[#303030]">Рекламный парк</span>
          </label>
        )}

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/parks")}>
            Отмена
          </Button>
        </div>
      </section>

      {/* Classes */}
      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-sm font-medium text-[#303030] mb-4">Классы и параметры</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-[#A1A1A1]">У парка пока нет классов</p>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => (
              <ClassAccordion
                key={cls.id}
                parkId={parkId!}
                cls={cls}
                vehicles={vehiclesByClass[cls.id] || []}
                onSaved={() => loadData()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Class accordion with 18 params ───────────────────── */

const PARAM_SECTIONS: Array<{
  title: string;
  fields: Array<{
    key: string;
    label: string;
    type: "decimal" | "int" | "select1to5" | "select1to6" | "select1to3";
    hint?: string;
  }>;
}> = [
  {
    title: "Комиссии и депозит",
    fields: [
      { key: "parkCommission", label: "Комиссия парка, %", type: "decimal" },
      { key: "withdrawalCommission", label: "Комиссия на вывод, %", type: "decimal" },
      { key: "transferCommission", label: "Комиссия перевода, %", type: "decimal" },
      { key: "deposit", label: "Депозит, ₽", type: "int" },
      { key: "depositReturnDays", label: "Возврат депозита (дней)", type: "int" },
    ],
  },
  {
    title: "Штрафы и сроки",
    fields: [
      { key: "latePenalty", label: "Штраф за просрочку, ₽", type: "int" },
      { key: "trafficFinePenalty", label: "Штраф за нарушение ПДД, ₽", type: "int" },
      { key: "terminationDays", label: "Срок расторжения (дней)", type: "int" },
    ],
  },
  {
    title: "Договор (1 — плохо, 5 — отлично)",
    fields: [
      { key: "contractFairness", label: "Честность договора", type: "select1to5" },
      { key: "contractMatch", label: "Соответствие реальности", type: "select1to5" },
      { key: "daysOff", label: "Выходные дни", type: "select1to5" },
    ],
  },
  {
    title: "Промоакции",
    fields: [
      { key: "newDriverPromoDays", label: "Промодни новичкам", type: "decimal" },
      { key: "maxPromoDaysInClass", label: "Макс. промодней", type: "decimal" },
    ],
  },
  {
    title: "Сервис (1 — плохо, 5 — отлично)",
    fields: [
      { key: "replacementCar", label: "Подменное авто", type: "select1to5" },
      { key: "insurance", label: "Страхование", type: "select1to5" },
      { key: "inspectionFreq", label: "Периодичность осмотров", type: "select1to5" },
      { key: "maintenanceDay", label: "День ТО", type: "select1to5" },
      { key: "extraScratch", label: "Учёт царапин", type: "select1to5" },
    ],
  },
  {
    title: "Ремонт",
    fields: [
      { key: "repairDowntime", label: "Простой на ремонте (1-6)", type: "select1to6" },
      { key: "selfRepair", label: "Самостоятельный ремонт (1-3)", type: "select1to3" },
      { key: "repairPricing", label: "Прайс на ремонт (1-3)", type: "select1to3" },
    ],
  },
];

function ClassAccordion({
  parkId,
  cls,
  vehicles,
  onSaved,
}: {
  parkId: string;
  cls: ParkClass;
  vehicles: Vehicle[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const initial: Record<string, string> = {};
  PARAM_SECTIONS.forEach((s) =>
    s.fields.forEach((f) => {
      const v = (cls as any)[f.key];
      initial[f.key] = v != null ? String(v) : "";
    }),
  );

  const [values, setValues] = useState<Record<string, string>>(initial);

  const update = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    setErr("");
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      PARAM_SECTIONS.forEach((s) =>
        s.fields.forEach((f) => {
          const raw = values[f.key];
          if (raw === "" || raw == null) return;
          const num = Number(raw);
          if (!isFinite(num)) return;
          body[f.key] = num;
        }),
      );
      await api(`/admin/parks/${parkId}/classes/${cls.id}`, {
        method: "PATCH",
        token,
        body,
      });
      setOk(true);
      setTimeout(() => setOk(false), 2000);
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: (typeof PARAM_SECTIONS)[0]["fields"][0]) => {
    const v = values[field.key] ?? "";

    if (field.type === "select1to5" || field.type === "select1to6" || field.type === "select1to3") {
      const max = field.type === "select1to6" ? 6 : field.type === "select1to3" ? 3 : 5;
      const opts = Array.from({ length: max }, (_, i) => i + 1);
      return (
        <select
          value={v}
          onChange={(e) => update(field.key, e.target.value)}
          className="w-full h-[38px] px-3 border border-[#E5E5E5] rounded-lg text-sm bg-white"
        >
          <option value="">—</option>
          {opts.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="number"
        step={field.type === "decimal" ? "0.01" : "1"}
        value={v}
        onChange={(e) => update(field.key, e.target.value)}
        className="w-full h-[38px] px-3 border border-[#E5E5E5] rounded-lg text-sm"
      />
    );
  };

  return (
    <div className="border border-[#E5E5E5] rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-medium text-[#303030]">
            {cls.name || CLASS_LABELS[cls.driverClass] || cls.driverClass}
          </h3>
          <p className="text-[11px] text-[#A1A1A1] mt-0.5">
            Рейтинг: {cls.rating ?? "—"} · авто: {vehicles.length}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[#A1A1A1] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#E5E5E5] pt-4">
          {err && (
            <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-[#FA6868]">{err}</p>
            </div>
          )}
          {ok && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-green-700">Сохранено</p>
            </div>
          )}

          {PARAM_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <h4 className="text-xs font-medium text-[#A1A1A1] uppercase tracking-wider mb-2">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-[#303030] mb-1">{f.label}</label>
                    {renderField(f)}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить параметры"}
            </Button>
          </div>

          {/* Vehicles */}
          <div className="mt-5 pt-5 border-t border-[#E5E5E5]">
            <h4 className="text-xs font-medium text-[#A1A1A1] uppercase tracking-wider mb-2">
              Автомобили ({vehicles.length})
            </h4>
            {vehicles.length === 0 ? (
              <p className="text-xs text-[#A1A1A1]">Нет автомобилей</p>
            ) : (
              <ul className="space-y-1">
                {vehicles.map((v) => (
                  <li key={v.id} className="text-xs text-[#303030]">
                    {v.brandName} {v.modelName} · {v.year} · {v.licensePlate || "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
