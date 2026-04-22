"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

export function CameraCapture({ open, onClose, onCapture, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        localStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Не удалось получить доступ к камере"));
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stream?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-[640px] w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{title || "Сделайте фото"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#A1A1A1] hover:text-[#303030]"
            aria-label="Закрыть"
          >
            &times;
          </button>
        </div>
        {error ? (
          <p className="text-sm text-[#FA6868] mb-4">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl bg-black aspect-video object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-lg border border-[#E5E5E5] text-sm text-[#303030] hover:bg-[#F4F4F4]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!!error || !stream}
            className="flex-1 h-12 rounded-lg bg-[#F8D62E] text-[#303030] font-medium disabled:opacity-50 hover:bg-[#f1cd16]"
          >
            Сделать снимок
          </button>
        </div>
      </div>
    </div>
  );
}
