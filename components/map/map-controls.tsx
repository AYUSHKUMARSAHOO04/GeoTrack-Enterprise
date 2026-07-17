"use client";

import { motion } from "framer-motion";
import {
  Plus,
  Minus,
  Locate,
  Flame,
  Satellite,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showSatellite: boolean;
  onToggleSatellite: () => void;
}

export function MapControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onLocate,
  showHeatmap,
  onToggleHeatmap,
  showSatellite,
  onToggleSatellite,
}: MapControlsProps) {
  const toggleButtons: {
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
  }[] = [
    { icon: Flame, label: "Heatmap", active: showHeatmap, onClick: onToggleHeatmap },
    { icon: Satellite, label: "Satellite", active: showSatellite, onClick: onToggleSatellite },
    { icon: Layers, label: "Layers", active: false, onClick: () => {} },
  ];

  return (
    <div className="absolute right-4 top-4 z-30 flex flex-col gap-2">
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-black/50 p-1 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
      >
        <button
          onClick={onZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mx-auto h-px w-5 bg-white/10" />
        <button
          onClick={onZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-black/50 p-1 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
      >
        {toggleButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              btn.active
                ? "bg-primary/20 text-primary"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            title={btn.label}
          >
            <btn.icon className="h-4 w-4" />
          </button>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={onLocate}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white/70 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-colors hover:bg-white/10 hover:text-white"
        title="Recenter"
      >
        <Locate className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
