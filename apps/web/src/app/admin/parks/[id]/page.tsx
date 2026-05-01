"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AddressInput } from "@/components/ui/address-input";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECTION_TITLE,
  ADMIN_SELECT,
  ADMIN_TEXTAREA,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "grey" | "green" | "red" | "yellow" | "blue" }
> = {
  DRAFT: { label: "Черновик", variant: "grey" },
  PENDING_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "grey" },
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
            const vs = await api<Vehicle[]>(
              `/admin/parks/${parkId}/classes/${cls.id}/vehicles`,
              { token },
            );
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

  const handleSubmitForReview = async () => {
    if (!parkId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${parkId}/submit-for-review`, { method: "POST", token });
      setSuccessMsg("Парк отправлен на проверку супер-менеджеру");
      setSuccessOpen(true);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить на проверку");
    }
  };

  const handleApprove = async () => {
    if (!parkId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${parkId}/approve`, { method: "POST", token });
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
      await api(`/admin/parks/${parkId}/reject`, {
        method: "POST",
        token,
        body: { reason },
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
        <Link href="/admin/parks" className="text-xs text-[#1F1F1F] underline mt-2 inline-block">
          К списку таксопарков
        </Link>
      </div>
    );
  }

  if (!park) return null;

  const status = STATUS_CONFIG[park.status] || { label: park.status, variant: "grey" as const };
  const isManager = user?.role === "MANAGER";
  const isSmOrAdmin = user?.role === "ADMIN" || user?.role === "SUPER_MANAGER";

  return (
    <div className="max-w-[1100px]">
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

      <Link
        href="/admin/parks"
        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку таксопарков
      </Link>

      {/* ── Header ── */}
      <div className={`${ADMIN_CARD} p-6 mb-5`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className={ADMIN_PAGE_TITLE}>{park.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={statusBadgeClass(status.variant)}>{status.label}</span>
              {park.isAdvertised && (
                <span className="inline-flex items-center px-2.5 h-[26px] rounded-full text-[11px] font-semibold bg-[#F8D62E] text-[#1F1F1F]">
                  Реклама
                </span>
              )}
              {park.rating != null && (
                <span className="text-xs text-[#A1A1A1]">
                  Рейтинг: <span className="text-[#1F1F1F] font-medium">{park.rating}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            {isManager && park.status === "DRAFT" && (
              <button
                type="button"
                onClick={handleSubmitForReview}
                className={ADMIN_PRIMARY_BTN}
              >
                Отправить на проверку СМ
              </button>
            )}
            {isSmOrAdmin && park.status === "PENDING_REVIEW" && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center justify-center h-[44px] px-6 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="inline-flex items-center justify-center h-[44px] px-6 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                >
                  Отклонить
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* ── Basic info ── */}
      <section className={`${ADMIN_CARD} p-5 md:p-6 mb-5`}>
        <h2 className={`${ADMIN_SECTION_TITLE} mb-5`}>Основные данные</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Название*
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Город
            </label>
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Адрес
            </label>
            <AddressInput
              value={form.address}
              onChange={(v) => setForm((p) => ({ ...p, address: v }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Часы работы
            </label>
            <input
              value={form.workingHours}
              onChange={(e) => setForm((p) => ({ ...p, workingHours: e.target.value }))}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Телефон
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={ADMIN_INPUT}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
            Описание
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className={ADMIN_TEXTAREA}
          />
        </div>

        {user?.role === "ADMIN" && (
          <label className="flex items-center justify-between gap-2 mt-5 py-3 border-t border-[#F2F2F2] cursor-pointer">
            <span className="text-sm font-medium text-[#1F1F1F]">Рекламный парк</span>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isAdvertised: !p.isAdvertised }))}
              className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${
                form.isAdvertised ? "bg-[#F8D62E]" : "bg-[#E5E5E5]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition ${
                  form.isAdvertised ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={ADMIN_PRIMARY_BTN}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/parks")}
            className={ADMIN_OUTLINE_BTN}
          >
            Отмена
          </button>
        </div>
      </section>

      {/* ── Classes ── */}
      <section className={`${ADMIN_CARD} p-5 md:p-6`}>
        <h2 className={`${ADMIN_SECTION_TITLE} mb-5`}>Классы и параметры</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-[#A1A1A1] py-6 text-center">У парка пока нет классов</p>
        ) : (
          <div className="space-y-3">
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (
      field.type === "select1to5" ||
      field.type === "select1to6" ||
      field.type === "select1to3"
    ) {
      const max = field.type === "select1to6" ? 6 : field.type === "select1to3" ? 3 : 5;
      const opts = Array.from({ length: max }, (_, i) => i + 1);
      return (
        <select
          value={v}
          onChange={(e) => update(field.key, e.target.value)}
          className={`${ADMIN_SELECT} h-[40px]`}
        >
          <option value="">—</option>
          {opts.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
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
        className={`${ADMIN_INPUT} h-[40px]`}
      />
    );
  };

  return (
    <div className="border border-[#EFEFEF] rounded-[16px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-[#1F1F1F]">
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
        <div className="px-5 pb-5 border-t border-[#F2F2F2] pt-5">
          {err && (
            <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[10px] px-3 py-2 mb-3">
              <p className="text-xs text-[#FA6868]">{err}</p>
            </div>
          )}
          {ok && (
            <div className="bg-[#E8F7EE] border border-[#3BB560]/30 rounded-[10px] px-3 py-2 mb-3">
              <p className="text-xs text-[#3BB560]">Сохранено</p>
            </div>
          )}

          {PARAM_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <h4 className="text-[11px] font-semibold text-[#A1A1A1] uppercase tracking-wider mb-3">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-[#1F1F1F] mb-1.5">
                      {f.label}
                    </label>
                    {renderField(f)}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`${ADMIN_PRIMARY_BTN} h-[40px]`}
            >
              {saving ? "Сохранение..." : "Сохранить параметры"}
            </button>
          </div>

          {/* Vehicles */}
          <div className="mt-6 pt-5 border-t border-[#F2F2F2]">
            <h4 className="text-[11px] font-semibold text-[#A1A1A1] uppercase tracking-wider mb-3">
              Автомобили ({vehicles.length})
            </h4>
            {vehicles.length === 0 ? (
              <p className="text-xs text-[#A1A1A1]">Нет автомобилей</p>
            ) : (
              <ul className="space-y-1.5">
                {vehicles.map((v) => (
                  <li key={v.id} className="text-sm text-[#1F1F1F]">
                    <span className="font-medium">
                      {v.brandName} {v.modelName}
                    </span>
                    <span className="text-[#A1A1A1]"> · {v.year} · {v.licensePlate || "—"}</span>
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
