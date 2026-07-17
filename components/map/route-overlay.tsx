"use client";

import { motion } from "framer-motion";
import type { RoutePoint } from "@/hooks/use-live-map";

interface RouteOverlayProps {
  points: RoutePoint[];
  mapCenter: { lat: number; lng: number };
  zoom: number;
  progress?: number;
}

export function RouteOverlay({ points, mapCenter, zoom, progress = 1 }: RouteOverlayProps) {
  if (points.length < 2) return null;

  const project = (lat: number, lng: number) => {
    const deltaLat = lat - mapCenter.lat;
    const deltaLng = lng - mapCenter.lng;
    const scale = Math.pow(2, zoom) * 100;
    return {
      x: 50 + (deltaLng * scale) / 100,
      y: 50 - (deltaLat * scale * 1.3) / 100,
    };
  };

  const projected = points.map((p) => project(p.lat, p.lng));
  const visibleCount = Math.max(2, Math.floor(points.length * progress));
  const visible = projected.slice(0, visibleCount);

  const pathD = visible
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const lastPoint = visible[visible.length - 1];
  const firstPoint = visible[0];

  return (
    <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.1} />
          <stop offset="50%" stopColor="hsl(199 89% 48%)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.9} />
        </linearGradient>
        <filter id="routeGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#routeGradient)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#routeGlow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {firstPoint && (
        <circle cx={firstPoint.x} cy={firstPoint.y} r={3} fill="hsl(142 71% 45%)" opacity={0.8} />
      )}

      {lastPoint && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={5}
          fill="hsl(199 89% 48%)"
          animate={{ r: [5, 7, 5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}
