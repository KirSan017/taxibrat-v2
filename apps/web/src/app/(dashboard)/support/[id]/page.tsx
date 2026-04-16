"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* ── mock data ─────────────────────────────────────────── */

interface Message {
  id: string;
  sender: string;
  role: "user" | "manager" | "system";
  text: string;
  timestamp: string;
}

const MOCK_TICKET = {
  id: "1",
  title: "Проверка таксопарка «Альфа»",
  status: "IN_PROGRESS" as const,
  manager: "Анна К.",
};

const MOCK_MESSAGES: Message[] = [
  { id: "1", sender: "Система", role: "system", text: "Тикет создан. Ожидание назначения менеджера.", timestamp: "14.04.2025 09:00" },
  { id: "2", sender: "Система", role: "system", text: "Менеджер Анна К. назначена на ваш запрос.", timestamp: "14.04.2025 09:15" },
  { id: "3", sender: "Анна К.", role: "manager", text: "Здравствуйте! Я ваш менеджер по проверке таксопарка «Альфа». Для начала проверки мне потребуются дополнительные данные.", timestamp: "14.04.2025 09:20" },
  { id: "4", sender: "Анна К.", role: "manager", text: "Пожалуйста, укажите номер договора с таксопарком и дату его заключения.", timestamp: "14.04.2025 09:21" },
  { id: "5", sender: "Иван Иванов", role: "user", text: "Здравствуйте! Договор #А-2024-1547, заключён 15.03.2024.", timestamp: "14.04.2025 10:05" },
  { id: "6", sender: "Анна К.", role: "manager", text: "Спасибо! Начинаю проверку. Это может занять 1-2 рабочих дня. Я сообщу вам о результатах.", timestamp: "14.04.2025 10:12" },
];

const STATUS_MAP = {
  NEW: { label: "Новый", variant: "yellow" as const },
  IN_PROGRESS: { label: "В работе", variant: "gray" as const },
  COMPLETED: { label: "Завершён", variant: "green" as const },
  REJECTED: { label: "Отклонён", variant: "red" as const },
};

/* ── component ─────────────────────────────────────────── */

export default function TicketChatPage() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessage: Message = {
      id: String(Date.now()),
      sender: "Иван Иванов",
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-[700px] flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/support" className="text-[#A1A1A1] hover:text-[#303030] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-medium text-[#303030]">{MOCK_TICKET.title}</h1>
          </div>
          <div className="flex items-center gap-3 ml-7">
            <Badge variant={STATUS_MAP[MOCK_TICKET.status].variant}>
              {STATUS_MAP[MOCK_TICKET.status].label}
            </Badge>
            <span className="text-xs text-[#A1A1A1]">Менеджер: {MOCK_TICKET.manager}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-xl p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => {
          if (msg.role === "system") {
            return (
              <div key={msg.id} className="text-center">
                <p className="text-[10px] text-[#A1A1A1] bg-white inline-block px-3 py-1.5 rounded-full">
                  {msg.text}
                </p>
                <p className="text-[9px] text-[#A1A1A1] mt-1">{msg.timestamp}</p>
              </div>
            );
          }

          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isUser && (
                    <div className="w-6 h-6 bg-[#F8D62E] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium text-[#303030]">
                        {msg.sender.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-[#303030]">{msg.sender}</span>
                  {!isUser && (
                    <span className="text-[9px] bg-[#F8D62E]/20 text-[#303030] px-1.5 py-0.5 rounded">
                      менеджер
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-[#303030] text-white rounded-br-sm"
                      : "bg-white border border-[#E5E5E5] text-[#303030] rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <p className={`text-[9px] text-[#A1A1A1] mt-1 ${isUser ? "text-right" : ""}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          className="flex-1 h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="h-[49px] w-[49px] bg-[#303030] text-white rounded-lg flex items-center justify-center hover:bg-[#404040] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
