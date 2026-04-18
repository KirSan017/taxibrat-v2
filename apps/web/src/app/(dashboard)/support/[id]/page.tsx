"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

/* ── types ───────────────────────────────────────────── */

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  isSystem?: boolean;
}

interface TicketDetail {
  id: string;
  topic: string;
  status: string;
  body?: string | null;
  title?: string | null;
  assignedManagerId?: string | null;
  createdAt: string;
  messages: Message[];
}

const STATUS_MAP: Record<string, { label: string; variant: "yellow" | "gray" | "green" | "red" }> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "gray" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "gray" },
};

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка таксопарка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение к такси",
  BUYOUT: "Выкуп авто",
  LEGAL: "Юридический вопрос",
  FRIENDSHIP_POINTS: "Баллы дружбы",
  OTHER: "Иное",
};

/* ── component ───────────────────────────────────────── */

export default function TicketChatPage() {
  const params = useParams();
  const ticketId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicket = () => {
    if (!ticketId || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<TicketDetail>(`/tickets/${ticketId}`, { token })
      .then((data) => setTicket(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки тикета"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !ticketId) return;
    const token = getAccessToken();
    if (!token) return;

    setSending(true);
    try {
      await api(`/tickets/${ticketId}/messages`, {
        method: "POST",
        token,
        body: { body: trimmed },
      });
      setInput("");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    if (!ticketId) return;
    if (!confirm("Вы уверены, что хотите отменить обращение?")) return;
    const token = getAccessToken();
    if (!token) return;
    setCancelling(true);
    try {
      await api(`/tickets/${ticketId}/cancel`, { method: "POST", token });
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
    } finally {
      setCancelling(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading && !ticket) {
    return <div className="max-w-[700px] text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error && !ticket) {
    return (
      <div className="max-w-[700px]">
        <p className="text-sm text-[#FA6868]">{error}</p>
        <Link href="/support" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку тикетов
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  const status = STATUS_MAP[ticket.status] || { label: ticket.status, variant: "gray" as const };
  const title = ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic;
  const canCancel = ticket.status === "NEW" || ticket.status === "IN_PROGRESS";

  return (
    <div className="max-w-[700px] flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/support" className="text-[#A1A1A1] hover:text-[#303030] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-medium text-[#303030] truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-3 ml-7">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs text-[#A1A1A1]">
              {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
        </div>
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={cancelling}
            className="border-[#FA6868] text-[#FA6868] hover:bg-[#FA6868] hover:text-white"
          >
            {cancelling ? "..." : "Отменить"}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-xl p-4 space-y-4 bg-gray-50/50">
        {/* Initial body as first message */}
        {ticket.body && (
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-[10px] font-medium text-[#303030]">Вы</span>
              </div>
              <div className="rounded-xl px-4 py-3 text-sm bg-[#303030] text-white rounded-br-sm">
                {ticket.body}
              </div>
              <p className="text-[9px] text-[#A1A1A1] mt-1 text-right">
                {new Date(ticket.createdAt).toLocaleString("ru-RU", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}

        {ticket.messages.map((msg) => {
          const isUser = msg.senderId === user?.id;
          const timestamp = new Date(msg.createdAt).toLocaleString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
          });

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : ""}`}>
                  {!isUser && (
                    <div className="w-6 h-6 bg-[#F8D62E] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium text-[#303030]">М</span>
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-[#303030]">
                    {isUser ? "Вы" : "Менеджер"}
                  </span>
                </div>
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-[#303030] text-white rounded-br-sm"
                      : "bg-white border border-[#E5E5E5] text-[#303030] rounded-bl-sm"
                  }`}
                >
                  {msg.body}
                </div>
                <p className={`text-[9px] text-[#A1A1A1] mt-1 ${isUser ? "text-right" : ""}`}>
                  {timestamp}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {canCancel && (
        <div className="flex gap-2 mt-3 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            disabled={sending}
            className="flex-1 h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-[49px] w-[49px] bg-[#303030] text-white rounded-lg flex items-center justify-center hover:bg-[#404040] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
