"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Truck,
  Car,
  Package,
  Navigation,
  History,
  Battery,
  Clock,
  MapPin,
  Signal,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle, RoutePoint } from "@/hooks/use-live-map";

const VEHICLE_ICONS: Record<Vehicle["type"], LucideIcon> = {
  truck: Truck,
  van: Car,
  car: Car,
  asset: Package,
};

interface VehicleDrawerProps {
  vehicle: Vehicle | null;
  routeHistory: RoutePoint[];
  open: boolean;
  onClose: () => void;
  onTrackRoute: () => void;
  onViewHistory: () => void;
}

const STATUS_CONFIG = {
  moving: { color: "hsl(142 71% 45%)", bg: "bg-success/15", text: "text-success", label: "Moving" },
  idle: { color: "hsl(38 92% 50%)", bg: "bg-warning/15", text: "text-warning", label: "Idle" },
  offline: { color: "hsl(215 16% 47%)", bg: "bg-muted", text: "text-muted-foreground", label: "Offline" },
} as const;

function SpeedGauge({ speed, maxSpeed = 120 }: { speed: number; maxSpeed?: number }) {
  const percentage = Math.min((speed / maxSpeed) * 100, 100);
  const angle = (percentage / 100) * 180 - 90;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-24 w-40">
        <svg viewBox="0 0 160 80" className="h-full w-full">
          <path
            d="M 10 70 A 70 70 0 0 1 150 70"
            fill="none"
            stroke="hsl(215 28% 17%)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <motion.path
            d="M 10 70 A 70 70 0 0 1 150 70"
            fill="none"
            stroke={speed > 80 ? "hsl(0 84% 60%)" : "hsl(199 89% 48%)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="220"
            initial={{ strokeDashoffset: 220 }}
            animate={{ strokeDashoffset: 220 - (220 * percentage) / 100 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <motion.div
          className="absolute left-1/2 top-[70px] h-10 w-0.5 origin-bottom"
          style={{ background: speed > 80 ? "hsl(0 84% 60%)" : "hsl(199 89% 48%)" }}
          animate={{ rotate: angle }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="-mt-2 flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums text-white">{speed}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/40">km/h</span>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <Icon className="h-3 w-3" style={{ color }} />
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export function VehicleDrawer({
  vehicle,
  routeHistory,
  open,
  onClose,
  onTrackRoute,
  onViewHistory,
}: VehicleDrawerProps) {
  const Icon = vehicle ? VEHICLE_ICONS[vehicle.type] : Car;
  const status = vehicle ? STATUS_CONFIG[vehicle.status] : STATUS_CONFIG.offline;

  return (
    <AnimatePresence>
      {open && vehicle && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-l border-white/10 bg-[#0d1117]/95 backdrop-blur-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", status.bg)}>
                  <Icon className={cn("h-5 w-5", status.text)} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{vehicle.name}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn("flex items-center gap-1 text-[10px] font-medium", status.text)}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
                      {status.label}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="px-5 py-5">
                <SpeedGauge speed={vehicle.speed} />

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <StatTile icon={Battery} label="Battery" value={`${vehicle.battery}%`} color={vehicle.battery > 50 ? "hsl(142 71% 45%)" : vehicle.battery > 20 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"} />
                  <StatTile icon={Signal} label="Signal" value={vehicle.status === "offline" ? "Lost" : "Strong"} color={vehicle.status === "offline" ? "hsl(0 84% 60%)" : "hsl(142 71% 45%)"} />
                  <StatTile icon={User} label="Driver" value={vehicle.driver} />
                  <StatTile icon={Clock} label="Last Update" value={vehicle.status === "offline" ? "32m ago" : "2s ago"} color={vehicle.status === "offline" ? "hsl(0 84% 60%)" : "hsl(142 71% 45%)"} />
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                      Route History
                    </span>
                    <span className="text-[10px] text-white/30">{routeHistory.length} points</span>
                  </div>
                  <div className="space-y-1.5">
                    {routeHistory.slice(-5).reverse().map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.05 }}
                        className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <MapPin className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70">
                            {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {new Date(point.timestamp).toLocaleTimeString()} · {point.speed} km/h
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/5 px-5 py-4">
              <button
                onClick={onTrackRoute}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Navigation className="h-3.5 w-3.5" />
                Track Route
              </button>
              <button
                onClick={onViewHistory}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
