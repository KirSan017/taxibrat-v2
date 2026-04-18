"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

/* ── types ──────────────────────────────────────────────── */

interface NewsItem {
  id: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

interface NewsResponse {
  data: NewsItem[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function makePreview(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 180 ? `${flat.slice(0, 180)}…` : flat;
}

/* ── component ──────────────────────────────────────────── */

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<NewsResponse>(`/news?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setItems(r.data || []);
        setTotal(r.total || 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Не удалось загрузить новости");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      {/* ══════ BANNER ══════ */}
      <section className="bg-[#F3F1E7]">
        <div className="max-w-[1600px] mx-auto px-6 py-10 md:py-16">
          <h1 className="text-3xl md:text-[40px] font-medium text-[#303030] leading-tight">
            Новости
          </h1>
          <p className="mt-3 text-sm text-[#A1A1A1] max-w-lg leading-relaxed">
            Последние обновления и события платформы ТаксиБрат.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        <div className="max-w-3xl">
          {loading && <p className="text-sm text-[#A1A1A1]">Загрузка...</p>}
          {error && !loading && (
            <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4">
              <p className="text-sm text-[#FA6868]">{error}</p>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-[#A1A1A1]">Новостей пока нет</p>
          )}

          <div className="space-y-4 mb-8">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const preview = makePreview(item.body);
              return (
                <article
                  key={item.id}
                  className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left p-5 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-[#A1A1A1] mb-1.5">
                          {formatDate(item.publishedAt || item.createdAt)}
                        </p>
                        <h3 className="text-base font-medium text-[#303030] mb-2">{item.title}</h3>
                        <p className="text-sm text-[#A1A1A1] leading-relaxed">{preview}</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-[#A1A1A1] shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 md:px-6 md:pb-6">
                      <div className="border-t border-[#E5E5E5] pt-4 space-y-3">
                        <p className="text-sm text-[#303030] leading-relaxed whitespace-pre-line">{item.body}</p>
                        {item.linkUrl && (
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm text-[#303030] underline hover:text-black"
                          >
                            Подробнее →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 mb-12">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-[#303030] text-white"
                      : "text-[#303030] hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-[#A1A1A1] hover:bg-gray-100 disabled:opacity-30"
              >
                &raquo;
              </button>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
