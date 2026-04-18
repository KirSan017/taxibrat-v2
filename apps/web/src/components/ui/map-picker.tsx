"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

export type LatLng = [number, number];

interface MapPickerProps {
  center?: LatLng;
  pointA?: LatLng | null;
  pointB?: LatLng | null;
  onPointAChange?: (coords: LatLng | null) => void;
  onPointBChange?: (coords: LatLng | null) => void;
  activePoint?: "A" | "B";
  height?: string;
  autoLocate?: boolean;
}

// Dynamic import the inner map to avoid SSR problems with Leaflet (window/document access)
const MapInner = dynamic(() => import("./map-picker-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-xs text-[#A1A1A1]">
      Загрузка карты...
    </div>
  ),
});

export function MapPicker({
  center,
  pointA,
  pointB,
  onPointAChange,
  onPointBChange,
  activePoint = "B",
  height = "400px",
  autoLocate = true,
}: MapPickerProps) {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!autoLocate) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // silent
      },
      { maximumAge: 60_000, timeout: 5_000 },
    );
  }, [autoLocate]);

  const initialCenter: LatLng =
    center || pointA || pointB || currentLocation || [55.7558, 37.6173]; // Москва

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-[#E5E5E5] bg-gray-50"
      style={{ height }}
    >
      <MapInner
        center={initialCenter}
        pointA={pointA ?? null}
        pointB={pointB ?? null}
        currentLocation={currentLocation}
        onPointAChange={onPointAChange}
        onPointBChange={onPointBChange}
        activePoint={activePoint}
      />
    </div>
  );
}
