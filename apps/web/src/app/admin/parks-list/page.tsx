"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Park {
  id: string;
  name: string;
  status: string;
  isAdvertised?: boolean;
  city?: string | null;
  createdAt: string;
}

interface ParksResponse {
  data: Park[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "gray" | "green" | "red" }> = {
  DRAFT: { label: "Черновик", variant: "gray" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

/* ── page ─────────────────────────────────────────────── */

export default function AdminParksListPage() {
  const { user } = useAuth();
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // create form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("moscow");
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; name: string; address: string | null; phone: string | null }>>([]);
  const [checkingDups, setCheckingDups] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<ParksResponse>("/admin/parks?page=1&limit=100", { token })
      .then((res) => setParks(res.data || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = parks.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const checkDuplicates = async () => {
    const token = getAccessToken();
    if (!token) return;
    setCheckingDups(true);
    try {
      const params = new URLSearchParams();
      if (phone.trim()) params.set("phone", phone.trim());
      if (name.trim()) params.set("name", name.trim());
      if (address.trim()) params.set("address", address.trim());
      const res = await api<Array<{ id: string; name: string; address: string | null; phone: string | null }>>(
        `/admin/parks/duplicates?${params.toString()}`,
        { token },
      );
      setDuplicates(Array.isArray(res) ? res : []);
    } catch {
      setDuplicates([]);
    } finally {
      setCheckingDups(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/admin/parks", {
        method: "POST",
        token,
        body: { name, address, phone, city },
      });
      setShowCreate(false);
      setName("");
      setAddress("");
      setPhone("");
      setDuplicates([]);
      setSuccessMsg("Таксопарк создан");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAd = async (park: Park) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${park.id}`, {
        method: "PATCH",
        token,
        body: { isAdvertised: !park.isAdvertised },
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось изменить");
    }
  };

  const archive = async (park: Park) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${park.id}`, {
        method: "PATCH",
        token,
        body: { status: "ARCHIVED" },
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось");
    }
  };

  const restore = async (park: Park) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${park.id}`, {
        method: "PATCH",
        token,
        body: { status: "ACTIVE" },
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось");
    }
  };

  return (
    <div>
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Список таксопарков</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + Создать таксопарк
        </Button>
      </div>

      <div className="mb-6 w-full sm:w-[300px]">
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Город</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Загрузка...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A1A1A1]">Таксопарков нет</td></tr>
            ) : filtered.map((p) => {
              const sc = STATUS_CONFIG[p.status] || { label: p.status, variant: "gray" as const };
              return (
                <tr key={p.id} className="border-b border-[#E5E5E5] last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/parks/${p.id}`} className="text-[#303030] font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.isAdvertised && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F8D62E] text-[#303030]">
                        AD
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1A1]">{p.city || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => toggleAd(p)}
                          className="text-xs text-[#303030] hover:underline"
                        >
                          {p.isAdvertised ? "Снять с рекламы" : "В рекламу"}
                        </button>
                      )}
                      {p.status === "ACTIVE" && (
                        <button onClick={() => archive(p)} className="text-xs text-[#FA6868] hover:underline">
                          Архив
                        </button>
                      )}
                      {p.status === "ARCHIVED" && (
                        <button onClick={() => restore(p)} className="text-xs text-green-600 hover:underline">
                          Восстановить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => !submitting && setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 md:p-8">
            <h2 className="text-lg font-medium text-[#303030] mb-4">Создать таксопарк</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Название*"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Адрес*"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <Input
                label="Телефон*"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                label="Город"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              {duplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-xs font-medium text-[#303030] mb-2">
                    Найдены возможные дубли ({duplicates.length}):
                  </p>
                  <ul className="space-y-1 text-xs">
                    {duplicates.slice(0, 5).map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/admin/parks/${d.id}`}
                          className="text-[#303030] hover:underline"
                          target="_blank"
                        >
                          {d.name}
                        </Link>
                        <span className="text-[#A1A1A1]"> — {d.address || "—"} {d.phone ? `— ${d.phone}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => !submitting && setShowCreate(false)} disabled={submitting}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkDuplicates}
                  disabled={checkingDups || submitting || (!phone.trim() && !name.trim() && !address.trim())}
                >
                  {checkingDups ? "Поиск..." : "Проверить дубли"}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Создание..." : "Создать"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
