"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "./map-picker";

// Fix for Leaflet marker icons on webpack bundlers (icons load from CDN)
const iconA = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background:#22c55e;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:12px;font-family:system-ui">A</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconB = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background:#FA6868;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:12px;font-family:system-ui">Б</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconCurrent = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.3), 0 2px 6px rgba(0,0,0,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapInnerProps {
  center: LatLng;
  pointA: LatLng | null;
  pointB: LatLng | null;
  currentLocation: LatLng | null;
  onPointAChange?: (c: LatLng | null) => void;
  onPointBChange?: (c: LatLng | null) => void;
  activePoint?: "A" | "B";
}

function ClickHandler({
  activePoint,
  onPointAChange,
  onPointBChange,
}: {
  activePoint: "A" | "B";
  onPointAChange?: (c: LatLng) => void;
  onPointBChange?: (c: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      const coords: LatLng = [e.latlng.lat, e.latlng.lng];
      if (activePoint === "A") onPointAChange?.(coords);
      else onPointBChange?.(coords);
    },
  });
  return null;
}

/** Keeps the map centered on a focus target when it changes. */
function FocusHandler({ focus }: { focus: LatLng | null }) {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (!focus) return;
    const key = `${focus[0].toFixed(6)},${focus[1].toFixed(6)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    map.setView(focus, Math.max(map.getZoom(), 14), { animate: true });
  }, [focus, map]);
  return null;
}

export function MapInner({
  center,
  pointA,
  pointB,
  currentLocation,
  onPointAChange,
  onPointBChange,
  activePoint = "B",
}: MapInnerProps) {
  // Track a focus target: most recently changed point (A or B)
  const focus = pointB || pointA || currentLocation;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler
        activePoint={activePoint}
        onPointAChange={onPointAChange}
        onPointBChange={onPointBChange}
      />
      <FocusHandler focus={focus} />

      {currentLocation && !pointA && !pointB && (
        <Marker position={currentLocation} icon={iconCurrent} />
      )}
      {pointA && (
        <Marker
          position={pointA}
          icon={iconA}
          draggable={!!onPointAChange}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onPointAChange?.([ll.lat, ll.lng]);
            },
          }}
        />
      )}
      {pointB && (
        <Marker
          position={pointB}
          icon={iconB}
          draggable={!!onPointBChange}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onPointBChange?.([ll.lat, ll.lng]);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
