"use client";

import { useEffect, useState } from "react";
import { SuccessModal } from "@/components/ui/success-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Pagination } from "@/components/ui/pagination";
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
  ADMIN_TEXTAREA,
} from "@/components/admin/admin-styles";

/* ── types ────────────────────────────────────────────── */

interface NewsItem {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: string;
  isPublished?: boolean;
}

interface NewsResponse {
  data: NewsItem[];
  total: number;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminNewsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const isAdmin = user?.role === "ADMIN";

  const loadNews = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<NewsResponse>(`/admin/news?page=${page}&limit=${LIMIT}`, { token })
      .then((res) => {
        setItems(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setLinkUrl("");
    setShowForm(true);
  };

  const openEdit = (item: NewsItem) => {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body);
    setLinkUrl(item.linkUrl || "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, string> = { title, body };
      if (linkUrl) payload.linkUrl = linkUrl;

      if (editing) {
        await api(`/admin/news/${editing.id}`, { method: "PATCH", token, body: payload });
        setSuccessMsg("Новость обновлена");
      } else {
        await api("/admin/news", { method: "POST", token, body: payload });
        setSuccessMsg("Новость создана");
      }
      setShowForm(false);
      loadNews();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: NewsItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/news/${deleteTarget.id}`, { method: "DELETE", token });
      setSuccessMsg("Новость удалена");
      loadNews();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setDeleteTarget(null);
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
        onConfirm={confirmDelete}
        title="Удалить новость?"
        description={
          deleteTarget ? `Новость «${deleteTarget.title}» будет удалена безвозвратно.` : ""
        }
        confirmLabel="Удалить"
        variant="warning"
      />

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-wider font-medium">
            Публикации
          </p>
          <h1 className={`${ADMIN_PAGE_TITLE} mt-2 flex items-center gap-3`}>
            Новости
            <span className="inline-flex items-center justify-center min-w-[36px] h-[28px] px-2.5 rounded-full text-xs font-semibold bg-[#F2F2F2] text-[#1F1F1F]">
              {total}
            </span>
          </h1>
          <p className={ADMIN_PAGE_SUBTITLE}>Лента новостей для пользователей сервиса</p>
        </div>
        <button type="button" onClick={openCreate} className={ADMIN_PRIMARY_BTN}>
          + Создать новость
        </button>
      </div>

      {error && (
        <div className="bg-[#FDE8E8] border border-[#FA6868]/30 rounded-[12px] p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div className={`${ADMIN_CARD} p-12 text-center text-sm text-[#A1A1A1]`}>
          Новостей пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`${ADMIN_CARD} p-4 md:p-5`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#1F1F1F]">{item.title}</h3>
                  <p className="text-xs text-[#A1A1A1] mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className={`${ADMIN_OUTLINE_BTN} h-[36px] px-3 text-xs`}
                  >
                    Редактировать
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="inline-flex items-center justify-center h-[36px] px-3 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-xs font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#5E5E5E] line-clamp-2 whitespace-pre-line">
                {item.body}
              </p>
              {item.linkUrl && (
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1F1F1F] underline mt-2 inline-block hover:no-underline"
                >
                  {item.linkUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / LIMIT))}
          onPageChange={setPage}
        />
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !submitting && setShowForm(false)}
          />
          <div className="relative bg-white rounded-[20px] w-full max-w-lg p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => !submitting && setShowForm(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-[#F2F2F2] inline-flex items-center justify-center text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-[18px] font-semibold text-[#1F1F1F] mb-5">
              {editing ? "Редактировать новость" : "Новая новость"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Заголовок*
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Текст*
                </label>
                <textarea
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={ADMIN_TEXTAREA}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#A1A1A1] uppercase tracking-wider mb-1.5">
                  Ссылка
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className={ADMIN_INPUT}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setShowForm(false)}
                  disabled={submitting}
                  className={`${ADMIN_OUTLINE_BTN} flex-1`}
                >
                  Отмена
                </button>
                <button type="submit" disabled={submitting} className={`${ADMIN_PRIMARY_BTN} flex-1`}>
                  {submitting ? "Сохранение..." : editing ? "Обновить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
