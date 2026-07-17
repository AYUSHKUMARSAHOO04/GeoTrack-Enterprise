"use client";

import { motion } from "framer-motion";
import { Truck, Car, Package, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/hooks/use-live-map";

const VEHICLE_ICONS: Record<Vehicle["type"], LucideIcon> = {
  truck: Truck,
  van: Car,
  car: Car,
  asset: Package,
};

const STATUS_STYLES = {
  moving: {
    ring: "border-primary bg-primary/80",
    pulse: "bg-primary/30",
    label: "text-primary",
  },
  idle: {
    ring: "border-warning bg-warning/80",
    pulse: "bg-warning/20",
    label: "text-warning",
  },
  offline: {
    ring: "border-muted-foreground/40 bg-muted-foreground/20",
    pulse: "",
    label: "text-muted-foreground",
  },
} as const;

interface VehicleMarkerProps {
  vehicle: Vehicle;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function VehicleMarker({ vehicle, x, y, isSelected, onClick, index }: VehicleMarkerProps) {
  const Icon = VEHICLE_ICONS[vehicle.type];
  const styles = STATUS_STYLES[vehicle.status];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1, left: `${x}%`, top: `${y}%` }}
      transition={{
        opacity: { duration: 0.4, delay: index * 0.05 },
        scale: { duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] },
        left: { duration: 1, ease: "linear" },
        top: { duration: 1, ease: "linear" },
      }}
      onClick={onClick}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {vehicle.status === "moving" && (
        <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-60" style={{ backgroundColor: styles.pulse }} />
      )}

      <div
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-200",
          styles.ring,
          isSelected && "scale-125 ring-2 ring-offset-2 ring-offset-[#0a0e14]",
          isSelected && vehicle.status === "moving" && "ring-primary/50",
          isSelected && vehicle.status === "idle" && "ring-warning/50",
          isSelected && vehicle.status === "offline" && "ring-muted-foreground/30"
        )}
      >
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.9 }}
          className="absolute left-1/2 top-9 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-xs font-medium text-white shadow-xl backdrop-blur-xl"
        >
          {vehicle.name}
          <span className={cn("ml-1.5 text-[10px]", styles.label)}>
            {vehicle.speed} km/h
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}
