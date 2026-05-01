"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RejectModal } from "@/components/ui/reject-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import {
  ADMIN_CARD,
  ADMIN_OUTLINE_BTN,
  ADMIN_PAGE_TITLE,
  ADMIN_PRIMARY_BTN,
  statusBadgeClass,
} from "@/components/admin/admin-styles";

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
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
  messages: Message[];
}

const STATUS_MAP: Record<
  string,
  { label: string; variant: "yellow" | "grey" | "green" | "red" | "blue" }
> = {
  NEW: { label: "Новый", variant: "yellow" },
  IN_PROGRESS: { label: "В работе", variant: "blue" },
  PENDING_SM_REVIEW: { label: "На проверке СМ", variant: "yellow" },
  SM_REJECTED: { label: "Отклонён", variant: "red" },
  COMPLETED: { label: "Завершён", variant: "green" },
  CANCELLED: { label: "Отменён", variant: "grey" },
};

const TOPIC_LABELS: Record<string, string> = {
  PARK_CHECK: "Проверка таксопарка",
  PARK_ADD: "Добавление таксопарка",
  USER_BASE_CHECK: "Проверка по базе",
  TAXI_CONNECT: "Подключение к такси",
  BUYOUT: "Выкуп авто",
  LEGAL: "Юридический вопрос",
  FRIENDSHIP_POINTS: "Баллы дружбы",
  IDEA: "Идея",
  OTHER: "Иное",
};

function getRelatedLink(ticket: TicketDetail): { href: string; label: string } | null {
  if (!ticket.relatedEntityId) return null;
  if (ticket.topic === "PARK_CHECK" || ticket.topic === "PARK_ADD") {
    return { href: `/admin/parks/${ticket.relatedEntityId}`, label: "Открыть редактор парка" };
  }
  if (ticket.topic === "TAXI_CONNECT") {
    return { href: `/admin/parks-list`, label: "К парку" };
  }
  if (ticket.topic === "BUYOUT") {
    return { href: `/admin/buyout/${ticket.relatedEntityId}`, label: "Открыть карточку выкупа" };
  }
  if (ticket.topic === "USER_BASE_CHECK" && ticket.relatedEntityType === "USER") {
    return { href: `/admin/users/${ticket.relatedEntityId}`, label: "К пользователю" };
  }
  return null;
}

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
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
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
        <Link
          href="/admin/tickets"
          className="text-xs text-[#1F1F1F] underline mt-2 inline-block"
        >
          К списку тикетов
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  const status = STATUS_MAP[ticket.status] || { label: ticket.status, variant: "grey" as const };
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
    <div className="max-w-[1100px] flex flex-col h-[calc(100vh-160px)]">
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
      <ConfirmModal
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={handleClose}
        title="Отправить тикет на проверку СМ?"
        description="Тикет перейдёт в статус «На проверке СМ» и будет ждать решения супер-менеджера."
        confirmLabel="Отправить"
      />
      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg("")}
        title="Готово"
        description={successMsg}
      />

      {/* ── Breadcrumb ── */}
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1A1] hover:text-[#1F1F1F] transition-colors mb-3 shrink-0"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку тикетов
      </Link>

      {/* ── Header ── */}
      <div className={`${ADMIN_CARD} p-5 mb-4 shrink-0`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className={`${ADMIN_PAGE_TITLE} truncate`} style={{ fontSize: "22px" }}>
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={statusBadgeClass(status.variant)}>{status.label}</span>
              <span className="inline-flex items-center px-2 h-[24px] rounded-full text-[11px] font-medium bg-[#F2F2F2] text-[#1F1F1F]">
                {TOPIC_LABELS[ticket.topic] || ticket.topic}
              </span>
              <span className="text-xs text-[#A1A1A1]">
                {new Date(ticket.createdAt).toLocaleString("ru-RU")}
              </span>
              {ticket.topic === "TAXI_CONNECT" && ticket.rentalConfirmedAt && (
                <span className={statusBadgeClass("green")}>Аренда подтверждена</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            {(() => {
              const rel = getRelatedLink(ticket);
              return rel ? (
                <Link href={rel.href} className={`${ADMIN_OUTLINE_BTN} h-[40px]`}>
                  {rel.label}
                </Link>
              ) : null;
            })()}
            {canClose && (
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(true)}
                className={`${ADMIN_PRIMARY_BTN} h-[40px]`}
              >
                Закрыть тикет
              </button>
            )}
            {canReviewSM && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] border border-[#FA6868] text-[#FA6868] text-sm font-medium hover:bg-[#FA6868] hover:text-white transition-colors"
                >
                  Отклонить
                </button>
              </>
            )}
            {canConfirmRental && (
              <button
                type="button"
                onClick={() => setConfirmRentalOpen(true)}
                className="inline-flex items-center justify-center h-[40px] px-4 rounded-[10px] bg-[#3BB560] text-white text-sm font-medium hover:bg-[#2FA350] transition-colors"
              >
                Подтвердить аренду (+300 б.)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className={`${ADMIN_CARD} flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAFA]/40`}>
        {ticket.body && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-[#F2F2F2] rounded-full flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-[#A1A1A1]">U</span>
                </div>
                <span className="text-[11px] font-medium text-[#1F1F1F]">Пользователь</span>
              </div>
              <div className="rounded-[16px] px-4 py-3 text-sm bg-white border border-[#EFEFEF] text-[#1F1F1F] rounded-bl-[4px] shadow-sm">
                {ticket.body}
              </div>
              <p className="text-[10px] text-[#A1A1A1] mt-1.5">
                {new Date(ticket.createdAt).toLocaleString("ru-RU")}
              </p>
            </div>
          </div>
        )}

        {ticket.messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isFromCreator = msg.senderId === ticket.creatorId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div className={`flex items-center gap-2 mb-1.5 ${isMe ? "justify-end" : ""}`}>
                  <span className="text-[11px] font-medium text-[#1F1F1F]">
                    {isMe ? "Вы" : isFromCreator ? "Пользователь" : "Менеджер"}
                  </span>
                </div>
                <div
                  className={`rounded-[16px] px-4 py-3 text-sm shadow-sm ${
                    isMe
                      ? "bg-[#1F1F1F] text-white rounded-br-[4px]"
                      : "bg-white border border-[#EFEFEF] text-[#1F1F1F] rounded-bl-[4px]"
                  }`}
                >
                  {msg.body}
                </div>
                <p
                  className={`text-[10px] text-[#A1A1A1] mt-1.5 ${isMe ? "text-right" : ""}`}
                >
                  {new Date(msg.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      {canSendMessage && (
        <div className="flex gap-2 mt-3 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            disabled={sending}
            className="flex-1 h-[48px] px-4 border border-[#E5E5E5] rounded-[12px] text-sm text-[#1F1F1F] placeholder:text-[#A1A1A1] outline-none focus:border-[#F8D62E] transition-colors disabled:opacity-50 bg-white"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-[48px] w-[48px] bg-[#F8D62E] text-[#1F1F1F] rounded-[12px] flex items-center justify-center hover:bg-[#F8D62E]/90 active:bg-[#E5C42A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
