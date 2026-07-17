"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Vehicle {
  id: string;
  name: string;
  type: "truck" | "van" | "car" | "asset";
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  status: "moving" | "idle" | "offline";
  heading: number;
  driver: string;
  routeProgress: number;
  route: { lat: number; lng: number }[];
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
}

const VEHICLE_TYPES: Vehicle["type"][] = ["truck", "van", "car", "asset"];
const DRIVERS = ["James Wilson", "Sarah Chen", "Mike Rodriguez", "Emma Davis", "Alex Kim"];

function generateRoute(centerLat: number, centerLng: number, seed: number): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  const steps = 24;
  let lat = centerLat + (Math.sin(seed) * 0.02);
  let lng = centerLng + (Math.cos(seed) * 0.02);

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2 + seed;
    lat += Math.sin(angle) * 0.0015;
    lng += Math.cos(angle) * 0.0015;
    points.push({ lat, lng });
  }
  return points;
}

const INITIAL_VEHICLES: Vehicle[] = Array.from({ length: 8 }, (_, i) => {
  const type = VEHICLE_TYPES[i % VEHICLE_TYPES.length] ?? "truck";
  const baseLat = 37.7749 + (Math.sin(i * 1.5) * 0.03);
  const baseLng = -122.4194 + (Math.cos(i * 1.5) * 0.03);
  const route = generateRoute(baseLat, baseLng, i * 0.7);
  const status: Vehicle["status"] = i % 4 === 3 ? "idle" : i % 6 === 5 ? "offline" : "moving";

  return {
    id: `v-${i + 1}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)}-${String(i + 1).padStart(3, "0")}`,
    type,
    lat: route[0]?.lat ?? baseLat,
    lng: route[0]?.lng ?? baseLng,
    speed: status === "moving" ? 30 + Math.floor(Math.random() * 50) : 0,
    battery: 20 + Math.floor(Math.random() * 80),
    status,
    heading: Math.floor(Math.random() * 360),
    driver: DRIVERS[i % DRIVERS.length] ?? "Unassigned",
    routeProgress: Math.random(),
    route,
  };
});

export function useLiveMap() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [isLive, setIsLive] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "fair">("excellent");
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!isLive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > 1000) {
        lastUpdateRef.current = timestamp;
        setTick((t) => t + 1);

        setVehicles((prev) =>
          prev.map((v) => {
            if (v.status !== "moving") return v;

            const progress = (v.routeProgress + 0.004) % 1;
            const routeIdx = Math.floor(progress * v.route.length);
            const nextIdx = (routeIdx + 1) % v.route.length;
            const current = v.route[routeIdx];
            const next = v.route[nextIdx];
            if (!current || !next) return v;

            const frac = progress * v.route.length - routeIdx;
            const lat = current.lat + (next.lat - current.lat) * frac;
            const lng = current.lng + (next.lng - current.lng) * frac;
            const heading = (Math.atan2(next.lng - current.lng, next.lat - current.lat) * 180) / Math.PI;
            const speed = Math.max(15, v.speed + (Math.random() - 0.5) * 12);

            return { ...v, lat, lng, heading, speed: Math.round(speed), routeProgress: progress };
          })
        );

        setConnectionQuality(() => {
          const r = Math.random();
          if (r > 0.92) return "fair";
          if (r > 0.75) return "good";
          return "excellent";
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isLive]);

  const getRouteHistory = useCallback(
    (vehicleId: string): RoutePoint[] => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) return [];
      return vehicle.route.map((point, i) => ({
        lat: point.lat,
        lng: point.lng,
        timestamp: Date.now() - (vehicle.route.length - i) * 60000,
        speed: 20 + Math.floor(Math.random() * 60),
      }));
    },
    [vehicles]
  );

  return { vehicles, isLive, setIsLive, connectionQuality, tick, getRouteHistory };
}
