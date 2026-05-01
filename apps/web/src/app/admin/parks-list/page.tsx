"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SuccessModal } from "@/components/ui/success-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
  ADMIN_TABLE_CELL,
  ADMIN_TABLE_HEADER,
  ADMIN_TABLE_ROW,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface Park {
  id: string;
  name: string;
  status: string;
  isAdvertised?: boolean;
  isSuperAdvertised?: boolean;
  city?: string | null;
  createdAt: string;
  hasAvailableCars?: boolean;
}

const LIMIT = 20;

interface ParksResponse {
  data: Park[];
  total: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "green" | "yellow" | "red" | "grey" }
> = {
  DRAFT: { label: "Черновик", variant: "grey" },
  PENDING_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  ACTIVE: { label: "Активен", variant: "green" },
  ARCHIVED: { label: "Архив", variant: "red" },
};

type AdState = "NONE" | "ADVERTISED" | "SUPER";
function parkAdState(p: { isAdvertised?: boolean; isSuperAdvertised?: boolean }): AdState {
  if (p.isSuperAdvertised) return "SUPER";
  if (p.isAdvertised) return "ADVERTISED";
  return "NONE";
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminParksListPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlight") ?? "";
  const [parks, setParks] = useState<Park[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; name: string; address: string | null; phone: string | null }>
  >([]);
  const [checkingDups, setCheckingDups] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Park | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const load = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (search.trim()) params.set("search", search.trim());
    api<ParksResponse>(`/admin/parks?${params.toString()}`, { token })
      .then((res) => {
        setParks(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, search]);

  const filtered = parks.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const checkDuplicates = async () => {
    const token = getAccessToken();
    if (!token) return;
    setCheckingDups(true);
    try {
      const params = new URLSearchParams();
      if (phone.trim()) params.set("phone", phone.trim());
      if (name.trim()) params.set("name", name.trim());
      if (address.trim()) params.set("address", address.trim());
      const res = await api<
        Array<{ id: string; name: string; address: string | null; phone: string | null }>
      >(`/admin/parks/duplicates?${params.toString()}`, { token });
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

  const setAdState = async (park: Park, state: AdState) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${park.id}`, {
        method: "PATCH",
        token,
        body: {
          isAdvertised: state === "ADVERTISED" || state === "SUPER",
          isSuperAdvertised: state === "SUPER",
        },
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось изменить");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/parks/${deleteTarget.id}`, { method: "DELETE", token });
      setDeleteTarget(null);
      setSuccessMsg("Таксопарк удалён");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
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
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Удалить таксопарк?"
        description={`Парк «${deleteTarget?.name ?? ""}» будет удалён. Это действие необратимо.`}
        confirmLabel="Удалить"
        variant="warning"
      />

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">Управление</p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2`}>Список таксопарков</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            {total} {total === 1 ? "парк" : "парков"} в системе
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={ADMIN_PRIMARY_BTN}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Создать таксопарк
        </button>
      </div>

      {/* ── Search ── */}
      <div className="mb-5">
        <div className="relative w-full sm:max-w-[360px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1A1] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${ADMIN_INPUT} pl-11`}
          />
        </div>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className={`${ADMIN_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ADMIN_TABLE_HEADER}>Название</th>
                <th className={ADMIN_TABLE_HEADER}>Город</th>
                <th className={ADMIN_TABLE_HEADER}>Статус</th>
                <th className={`${ADMIN_TABLE_HEADER} text-right`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm text-[#A1A1A1]">
                    Таксопарков нет
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const sc = STATUS_CONFIG[p.status] || { label: p.status, variant: "grey" as const };
                  const isGrey = p.hasAvailableCars === false;
                  const isHighlighted = highlightId && p.id === highlightId;
                  const rowClass = [
                    ADMIN_TABLE_ROW,
                    isGrey ? "opacity-60" : "",
                    isHighlighted ? "bg-[#FFFBE6]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={p.id} className={rowClass}>
                      <td className={ADMIN_TABLE_CELL}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/parks/${p.id}`}
                            className="font-medium text-[#1F1F1F] hover:text-[#9A7C00] transition-colors"
                          >
                            {p.name}
                          </Link>
                          {(p.isAdvertised || p.isSuperAdvertised) && (
                            <span className="inline-flex items-center gap-0.5 px-2 h-[22px] rounded-full text-[10px] font-semibold bg-[#F8D62E] text-[#1F1F1F]">
                              <span aria-hidden>★</span>
                              {p.isSuperAdvertised ? "Супер" : "Реклама"}
                            </span>
                          )}
                          {isGrey && (
                            <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[10px] font-medium bg-[#F2F2F2] text-[#A1A1A1]">
                              Нет машин
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} text-[#A1A1A1]`}>{p.city || "—"}</td>
                      <td className={ADMIN_TABLE_CELL}>
                        <span className={statusBadgeClass(sc.variant)}>{sc.label}</span>
                      </td>
                      <td className={`${ADMIN_TABLE_CELL} text-right`}>
                        <div className="inline-flex items-center gap-2 flex-wrap justify-end">
                          {isAdmin && (
                            <select
                              value={parkAdState(p)}
                              onChange={(e) => setAdState(p, e.target.value as AdState)}
                              className="text-xs h-[32px] px-2 border border-[#E5E5E5] rounded-[8px] bg-white text-[#1F1F1F] focus:border-[#F8D62E] focus:outline-none"
                              title="Реклама"
                            >
                              <option value="NONE">Без рекламы</option>
                              <option value="ADVERTISED">Реклама</option>
                              <option value="SUPER">Супер</option>
                            </select>
                          )}
                          {p.status === "ACTIVE" && (
                            <button
                              onClick={() => archive(p)}
                              className="text-xs h-[32px] px-3 rounded-[8px] text-[#FA6868] hover:bg-[#FDE8E8] transition-colors font-medium"
                            >
                              Архив
                            </button>
                          )}
                          {p.status === "ARCHIVED" && (
                            <button
                              onClick={() => restore(p)}
                              className="text-xs h-[32px] px-3 rounded-[8px] text-[#3BB560] hover:bg-[#E8F7EE] transition-colors font-medium"
                            >
                              Восстановить
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="text-xs h-[32px] px-3 rounded-[8px] text-[#FA6868] hover:bg-[#FDE8E8] transition-colors font-medium"
                            >
                              Удалить
                            </button>
                          )}
                          <Link
                            href={`/admin/parks/${p.id}`}
                            className="text-xs h-[32px] px-3 rounded-[8px] text-[#1F1F1F] hover:bg-[#F8D62E] transition-colors font-medium inline-flex items-center"
                          >
                            Открыть →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* Create form modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !submitting && setShowCreate(false)}
          />
          <div className="relative bg-white rounded-[20px] w-full max-w-lg p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h2 className="text-[20px] font-semibold text-[#1F1F1F] mb-5">Создать таксопарк</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Название*" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Адрес*" value={address} onChange={(e) => setAddress(e.target.value)} required />
              <Input label="Телефон*" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input label="Город" value={city} onChange={(e) => setCity(e.target.value)} />

              {duplicates.length > 0 && (
                <div className="bg-[#FEF7DA] border border-[#F8D62E]/40 rounded-[12px] p-3">
                  <p className="text-xs font-semibold text-[#9A7C00] mb-2">
                    Найдены возможные дубли ({duplicates.length}):
                  </p>
                  <ul className="space-y-1 text-xs">
                    {duplicates.slice(0, 5).map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/admin/parks/${d.id}`}
                          className="text-[#1F1F1F] font-medium hover:underline"
                          target="_blank"
                        >
                          {d.name}
                        </Link>
                        <span className="text-[#A1A1A1]">
                          {" "}
                          — {d.address || "—"} {d.phone ? `— ${d.phone}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setShowCreate(false)}
                  disabled={submitting}
                  className={ADMIN_OUTLINE_BTN}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={checkDuplicates}
                  disabled={
                    checkingDups || submitting || (!phone.trim() && !name.trim() && !address.trim())
                  }
                  className={ADMIN_OUTLINE_BTN}
                >
                  {checkingDups ? "Поиск..." : "Проверить дубли"}
                </button>
                <button type="submit" disabled={submitting} className={ADMIN_PRIMARY_BTN}>
                  {submitting ? "Создание..." : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
