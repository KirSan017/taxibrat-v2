"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuccessModal } from "@/components/ui/success-modal";
import { AuthModal } from "@/components/auth/auth-modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/use-auth";
import { getAccessToken } from "@/lib/auth";
import { OWNER_TYPE_LABELS } from "@/lib/labels";

interface ApiBuyout {
  id: string;
  title: string;
  brandId: string;
  modelId: string;
  year: number;
  price: number;
  mileage: number | null;
  vin7: string;
  description: string | null;
  photos: string[];
  ownerType: string;
  isAdvertised: boolean;
  status: string;
  createdAt: string;
}

function ownerBadgeVariant(type: string) {
  switch (type) {
    case "TAXI_PARK": return "yellow" as const;
    case "BANK": return "red" as const;
    case "LEGAL_ENTITY": return "green" as const;
    default: return "gray" as const;
  }
}

export default function BuyoutDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { user } = useAuth();

  const [car, setCar] = useState<ApiBuyout | null>(null);
  const [similar, setSimilar] = useState<ApiBuyout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentSlide, setCurrentSlide] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);

  const [showBooking, setShowBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ title: string; description: string; href?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      api<ApiBuyout>(`/buyout/${id}`),
      api<ApiBuyout[]>(`/buyout/${id}/similar`).catch(() => [] as ApiBuyout[]),
    ])
      .then(([detail, sim]) => {
        setCar(detail);
        setSimilar(Array.isArray(sim) ? sim : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Не удалось загрузить объявление");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const requireAuth = (fn: () => void) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    fn();
  };

  const sendBooking = async () => {
    if (!car) return;
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      // Create the buyout booking — server creates a BUYOUT ticket automatically.
      const ticket = await api<{ id: string }>(`/buyout/${car.id}/book`, {
        method: "POST",
        token,
      });
      // If user provided a comment, append it as a chat message.
      if (bookingMessage.trim() && ticket?.id) {
        try {
          await api(`/tickets/${ticket.id}/messages`, {
            method: "POST",
            token,
            body: { body: bookingMessage.trim() },
          });
        } catch {
          // non-fatal — the booking itself is created
        }
      }
      setShowBooking(false);
      setBookingMessage("");
      setSuccess({
        title: "Заявка отправлена",
        description: "Менеджер свяжется с вами в чате заявки.",
        href: ticket?.id ? `/support/${ticket.id}` : "/support",
      });
    } catch (e: unknown) {
      setSuccess({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать бронирование",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const createSupportTicket = async () => {
    if (!car) return;
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const ticket = await api<{ id: string }>(`/tickets`, {
        method: "POST",
        token,
        body: {
          topic: "BUYOUT",
          relatedEntityType: undefined,
          relatedEntityId: car.id,
          body: `Вопрос по выкупу: ${car.title}`,
        },
      });
      setSuccess({
        title: "Заявка создана",
        description: "Менеджер свяжется с вами в чате заявки.",
        href: ticket?.id ? `/support/${ticket.id}` : "/support",
      });
    } catch (e: unknown) {
      setSuccess({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать заявку",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="h-6 w-60 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[400px] bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-[400px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-medium text-[#303030] mb-2">Объявление не найдено</h1>
        <p className="text-sm text-[#A1A1A1] mb-5">{error || "Возможно, оно было архивировано."}</p>
        <Link href="/buyout">
          <Button variant="outline">К списку</Button>
        </Link>
      </div>
    );
  }

  const photos = car.photos && car.photos.length > 0 ? car.photos : [];
  const photoCount = photos.length;
  const ownerLabel = OWNER_TYPE_LABELS[car.ownerType] ?? car.ownerType;

  return (
    <>
      <div className="max-w-[1600px] mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#A1A1A1] mb-6">
          <Link href="/buyout" className="hover:text-[#303030] transition-colors">Выкуп авто</Link>
          <span>/</span>
          <span className="text-[#303030]">{car.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* ══════ PHOTO SLIDER ══════ */}
          <div>
            {/* Main photo */}
            <div className="relative bg-gray-200 rounded-xl h-[300px] md:h-[400px] flex items-center justify-center mb-3 overflow-hidden">
              {photoCount > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[currentSlide]} alt={car.title} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              )}
              {photoCount > 0 && (
                <>
                  <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                    {currentSlide + 1} / {photoCount}
                  </span>
                  {photoCount > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentSlide((p) => (p > 0 ? p - 1 : photoCount - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center text-[#303030] hover:bg-white transition-colors"
                      >
                        &lsaquo;
                      </button>
                      <button
                        onClick={() => setCurrentSlide((p) => (p < photoCount - 1 ? p + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center text-[#303030] hover:bg-white transition-colors"
                      >
                        &rsaquo;
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            {/* Thumbnails */}
            {photoCount > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {photos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`flex-none w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentSlide ? "border-[#303030]" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ══════ CAR INFO ══════ */}
          <div>
            <h1 className="text-2xl md:text-[32px] font-medium text-[#303030] mb-3">
              {car.title}
            </h1>

            <p className="text-3xl md:text-[40px] font-medium text-[#303030] mb-4">
              {car.price.toLocaleString("ru-RU")} ₽
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge variant={ownerBadgeVariant(car.ownerType)}>{ownerLabel}</Badge>
              {car.mileage != null && (
                <span className="text-sm text-[#A1A1A1]">
                  Пробег: {car.mileage.toLocaleString("ru-RU")} км
                </span>
              )}
              {car.vin7 && <span className="text-sm text-[#A1A1A1]">VIN: {car.vin7}</span>}
            </div>

            {car.description && (
              <div className="bg-[#F3F1E7] rounded-xl p-5 mb-6">
                <h3 className="text-sm font-medium text-[#303030] mb-2">Описание</h3>
                <p className="text-sm text-[#A1A1A1] leading-relaxed whitespace-pre-wrap">
                  {car.description}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => requireAuth(() => setShowBooking(true))}
                disabled={submitting}
              >
                Забронировать
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => requireAuth(createSupportTicket)}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? "..." : "Поддержка"}
              </Button>
            </div>
          </div>
        </div>

        {/* ══════ SIMILAR CARS ══════ */}
        {similar.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-medium text-[#303030] mb-6">Похожие автомобили</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
              {similar.map((sc) => (
                <Link
                  key={sc.id}
                  href={`/buyout/${sc.id}`}
                  className="flex-none w-[240px] snap-start border border-[#E5E5E5] rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white"
                >
                  <div className="h-[140px] bg-gray-200 flex items-center justify-center overflow-hidden">
                    {sc.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sc.photos[0]} alt={sc.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-[#303030] mb-1">{sc.title}</h3>
                    <p className="text-base font-medium text-[#303030] mb-1">
                      {sc.price.toLocaleString("ru-RU")} ₽
                    </p>
                    {sc.mileage != null && (
                      <p className="text-xs text-[#A1A1A1]">{sc.mileage.toLocaleString("ru-RU")} км</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ══════ BOOKING MODAL ══════ */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setShowBooking(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 md:p-8">
            <button
              onClick={() => !submitting && setShowBooking(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#A1A1A1] hover:text-[#303030] transition-colors"
              aria-label="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-medium text-[#303030] mb-1">Забронировать</h3>
            <p className="text-sm text-[#A1A1A1] mb-6">
              {car.title} — {car.price.toLocaleString("ru-RU")} ₽
            </p>

            <label className="block text-sm font-medium text-[#303030] mb-1.5">
              Комментарий (необязательно)
            </label>
            <textarea
              value={bookingMessage}
              onChange={(e) => setBookingMessage(e.target.value)}
              placeholder="Например: удобное время для звонка"
              className="w-full min-h-[120px] p-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] placeholder:text-[#B0B0B0] outline-none focus:border-[#303030] transition-colors resize-y"
              disabled={submitting}
            />

            <Button
              size="lg"
              className="w-full mt-4"
              onClick={sendBooking}
              disabled={submitting}
            >
              {submitting ? "Отправка..." : "Отправить заявку"}
            </Button>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <SuccessModal
        open={!!success}
        onClose={() => setSuccess(null)}
        title={success?.title ?? ""}
        description={success?.description}
        ctaLabel={success?.href ? "Открыть заявку" : "Ок"}
        onCta={() => {
          if (success?.href && typeof window !== "undefined") {
            window.location.href = success.href;
          } else {
            setSuccess(null);
          }
        }}
        secondaryLabel={success?.href ? "Закрыть" : undefined}
        onSecondary={() => setSuccess(null)}
      />
    </>
  );
}
