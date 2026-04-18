"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  depositAmount?: number | null;
  dailyRate?: number | null;
  commissionPercent?: number | null;
}

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
          <Input
            label="Адрес"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
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
        <h2 className="text-sm font-medium text-[#303030] mb-4">Классы и автомобили</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-[#A1A1A1]">У парка пока нет классов</p>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => {
              const vs = vehiclesByClass[cls.id] || [];
              return (
                <div key={cls.id} className="border border-[#E5E5E5] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-[#303030]">
                      {cls.name || cls.driverClass}
                    </h3>
                    <span className="text-xs text-[#A1A1A1]">
                      Депозит: {cls.depositAmount ?? "—"} ₽ · Аренда: {cls.dailyRate ?? "—"} ₽/день
                    </span>
                  </div>
                  {vs.length === 0 ? (
                    <p className="text-xs text-[#A1A1A1]">Нет автомобилей</p>
                  ) : (
                    <ul className="space-y-1">
                      {vs.map((v) => (
                        <li key={v.id} className="text-xs text-[#303030]">
                          {v.brandName} {v.modelName} · {v.year} · {v.licensePlate || "—"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
