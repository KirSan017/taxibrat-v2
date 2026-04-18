"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

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

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const loadNews = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<NewsResponse>("/admin/news?page=1&limit=50", { token })
      .then((res) => setItems(res.data || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const handleDelete = async (item: NewsItem) => {
    if (!confirm(`Удалить новость «${item.title}»?`)) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/news/${item.id}`, { method: "DELETE", token });
      setSuccessMsg("Новость удалена");
      loadNews();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
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
        <h1 className="text-xl font-medium text-[#303030]">Новости</h1>
        <Button size="sm" onClick={openCreate}>
          + Новая новость
        </Button>
      </div>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1]">Новостей пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[#303030]">{item.title}</h3>
                  <p className="text-xs text-[#A1A1A1] mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    Редактировать
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#FA6868] text-[#FA6868]"
                      onClick={() => handleDelete(item)}
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#A1A1A1] line-clamp-2">{item.body}</p>
              {item.linkUrl && (
                <a href={item.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-[#303030] underline mt-2 inline-block">
                  {item.linkUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 md:p-8">
            <button
              type="button"
              onClick={() => !submitting && setShowForm(false)}
              className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-medium text-[#303030] mb-4">
              {editing ? "Редактировать новость" : "Новая новость"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Заголовок*"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-1.5">
                  Текст*
                </label>
                <textarea
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] resize-none"
                />
              </div>
              <Input
                label="Ссылка"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => !submitting && setShowForm(false)} disabled={submitting}>
                  Отмена
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Сохранение..." : editing ? "Обновить" : "Создать"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
