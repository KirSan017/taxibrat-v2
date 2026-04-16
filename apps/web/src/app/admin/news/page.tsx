"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── types & mock data ────────────────────────────────── */

interface NewsItem {
  id: string;
  title: string;
  body: string;
  linkUrl: string;
  published: boolean;
  date: string;
}

const MOCK_NEWS: NewsItem[] = [
  { id: "1", title: "Обновление рейтинга таксопарков", body: "Мы обновили алгоритм расчёта рейтинга. Теперь учитываются отзывы за последние 6 месяцев и время отклика парка.", linkUrl: "https://example.com/news/1", published: true, date: "15.04.2026" },
  { id: "2", title: "Новый функционал «По делам, без 9%»", body: "Запустили сервис заказа такси без комиссии агрегатора. Доступно для всех активных пользователей.", linkUrl: "", published: true, date: "12.04.2026" },
  { id: "3", title: "Акция: двойные баллы дружбы", body: "С 1 по 30 апреля все приглашённые друзья приносят двойные баллы дружбы. Успейте воспользоваться!", linkUrl: "https://example.com/promo", published: false, date: "10.04.2026" },
  { id: "4", title: "Техническое обслуживание 20 апреля", body: "20 апреля с 03:00 до 06:00 MSK будет проводиться плановое обновление серверов. Возможны кратковременные перебои.", linkUrl: "", published: true, date: "08.04.2026" },
];

/* ── create/edit form ─────────────────────────────────── */

function NewsForm({ item, onClose }: { item?: NewsItem; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-[#E5E5E5] p-6 w-full max-w-[520px] mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1A1] hover:text-[#303030]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-medium text-[#303030] mb-4">
          {item ? "Редактировать новость" : "Создать новость"}
        </h2>

        <div className="space-y-4 mb-6">
          <Input label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок новости" />
          <div className="w-full">
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Текст</label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Текст новости..."
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-none"
            />
          </div>
          <Input label="Ссылка (необязательно)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="flex gap-3">
          <Button className="flex-1">Сохранить</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminNewsPage() {
  const [news, setNews] = useState(MOCK_NEWS);
  const [formState, setFormState] = useState<{ open: boolean; item?: NewsItem }>({ open: false });

  const togglePublished = (id: string) => {
    setNews((prev) =>
      prev.map((n) => (n.id === id ? { ...n, published: !n.published } : n))
    );
  };

  const deleteNews = (id: string) => {
    setNews((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div>
      {formState.open && (
        <NewsForm
          item={formState.item}
          onClose={() => setFormState({ open: false })}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-medium text-[#303030]">Новости</h1>
        <Button size="sm" onClick={() => setFormState({ open: true })}>+ Создать новость</Button>
      </div>

      {/* News list */}
      <div className="space-y-3">
        {news.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-[#E5E5E5] p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-[#303030]">{item.title}</h3>
                  <Badge variant={item.published ? "green" : "gray"}>
                    {item.published ? "Опубликовано" : "Черновик"}
                  </Badge>
                </div>
                <p className="text-sm text-[#A1A1A1] mb-2 line-clamp-2">{item.body}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#A1A1A1]">{item.date}</span>
                  {item.linkUrl && (
                    <span className="text-xs text-[#303030] bg-gray-100 px-2 py-0.5 rounded">
                      Есть ссылка
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle published */}
                <button
                  onClick={() => togglePublished(item.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    item.published ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      item.published ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>

                {/* Edit */}
                <button
                  onClick={() => setFormState({ open: true, item })}
                  className="p-1.5 text-[#A1A1A1] hover:text-[#303030] transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteNews(item.id)}
                  className="p-1.5 text-[#A1A1A1] hover:text-[#FA6868] transition-colors"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {news.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E5E5E5] px-4 py-12 text-center text-sm text-[#A1A1A1]">
            Новостей пока нет
          </div>
        )}
      </div>
    </div>
  );
}
