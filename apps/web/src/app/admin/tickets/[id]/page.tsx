"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ───────────────────────────────────────────── */

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  topic: string;
  status: string;
  title?: string | null;
  body?: string | null;
  creatorId: string;
  assignedManagerId?: string | null;
  rentalConfirmedAt?: string | null;
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

export default function AdminTicketChatPage() {
  const params = useParams();
  const ticketId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [confirmRentalOpen, setConfirmRentalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSuperManager = user?.role === "SUPER_MANAGER" || user?.role === "ADMIN";

  const loadTicket = () => {
    if (!ticketId || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<TicketDetail>(`/admin/tickets/${ticketId}`, { token })
      .then((data) => setTicket(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
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
      await api(`/admin/tickets/${ticketId}/messages`, {
        method: "POST",
        token,
        body: { body: trimmed },
      });
      setInput("");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!ticketId) return;
    if (!confirm("Отправить тикет на проверку СМ / закрыть?")) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/tickets/${ticketId}/close`, { method: "POST", token });
      setSuccessMsg("Тикет отправлен на проверку СМ");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть");
    }
  };

  const handleApprove = async () => {
    if (!ticketId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/tickets/${ticketId}/approve`, {
        method: "POST",
        token,
        body: {},
      });
      setSuccessMsg("Тикет одобрен, баллы начислены");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить");
    }
  };

  const handleConfirmRental = async () => {
    if (!ticketId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/tickets/${ticketId}/confirm-rental`, { method: "POST", token });
      setSuccessMsg("Факт аренды подтверждён, баллы начислены");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось подтвердить аренду");
    }
  };

  const handleReject = async (reason: string) => {
    if (!ticketId) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api(`/admin/tickets/${ticketId}/reject`, {
        method: "POST",
        token,
        body: { reason },
      });
      setSuccessMsg("Тикет отклонён, менеджеру отправлен на доработку");
      loadTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading && !ticket) {
    return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;
  }

  if (error && !ticket) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error}</p>
        <Link href="/admin/tickets" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку тикетов
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  const status = STATUS_MAP[ticket.status] || { label: ticket.status, variant: "gray" as const };
  const title = ticket.title || TOPIC_LABELS[ticket.topic] || ticket.topic;
  const canSendMessage = ticket.status === "NEW" || ticket.status === "IN_PROGRESS";
  const canClose = canSendMessage;
  const canReviewSM = isSuperManager && ticket.status === "PENDING_SM_REVIEW";
  const canConfirmRental =
    isSuperManager &&
    ticket.topic === "TAXI_CONNECT" &&
    ticket.status === "COMPLETED" &&
    !ticket.rentalConfirmedAt;

  return (
    <div className="max-w-[900px] flex flex-col h-[calc(100vh-180px)]">
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        title="Отклонить тикет"
        description="Укажите причину отклонения. Менеджер получит уведомление."
      />
      <ConfirmModal
        open={confirmRentalOpen}
        onClose={() => setConfirmRentalOpen(false)}
        onConfirm={handleConfirmRental}
        title="Подтвердить факт аренды?"
        description="Пользователю будут начислены дополнительные баллы дружбы (по умолчанию 300). Действие необратимо."
        confirmLabel="Подтвердить"
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div className="flex-1 min-w-0">
          <Link href="/admin/tickets" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            К списку
          </Link>
          <h1 className="text-lg font-medium text-[#303030] mt-1 truncate">{title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs text-[#A1A1A1]">
              {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {canClose && (
            <Button size="sm" onClick={handleClose}>
              Закрыть
            </Button>
          )}
          {canReviewSM && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
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
          {canConfirmRental && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setConfirmRentalOpen(true)}
            >
              Подтвердить факт аренды (+300 баллов)
            </Button>
          )}
          {ticket.topic === "TAXI_CONNECT" && ticket.rentalConfirmedAt && (
            <Badge variant="green">Аренда подтверждена</Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-xl p-4 space-y-4 bg-gray-50/50">
        {/* Initial body */}
        {ticket.body && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-[#E5E5E5] rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[#A1A1A1]">U</span>
                </div>
                <span className="text-[10px] font-medium text-[#303030]">Пользователь</span>
              </div>
              <div className="rounded-xl px-4 py-3 text-sm bg-white border border-[#E5E5E5] text-[#303030] rounded-bl-sm">
                {ticket.body}
              </div>
              <p className="text-[9px] text-[#A1A1A1] mt-1">
                {new Date(ticket.createdAt).toLocaleString("ru-RU")}
              </p>
            </div>
          </div>
        )}

        {ticket.messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isFromCreator = msg.senderId === ticket.creatorId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                <div className={`flex items-center gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                  <span className="text-[10px] font-medium text-[#303030]">
                    {isMe ? "Вы" : isFromCreator ? "Пользователь" : "Менеджер"}
                  </span>
                </div>
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    isMe
                      ? "bg-[#303030] text-white rounded-br-sm"
                      : "bg-white border border-[#E5E5E5] text-[#303030] rounded-bl-sm"
                  }`}
                >
                  {msg.body}
                </div>
                <p className={`text-[9px] text-[#A1A1A1] mt-1 ${isMe ? "text-right" : ""}`}>
                  {new Date(msg.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {canSendMessage && (
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
