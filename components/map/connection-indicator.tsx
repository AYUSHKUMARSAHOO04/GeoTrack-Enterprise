"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  quality: "excellent" | "good" | "fair";
  isLive: boolean;
  tick: number;
}

const QUALITY_CONFIG = {
  excellent: { label: "Excellent", color: "hsl(142 71% 45%)", bars: 4 },
  good: { label: "Good", color: "hsl(199 89% 48%)", bars: 3 },
  fair: { label: "Fair", color: "hsl(38 92% 50%)", bars: 2 },
} as const;

export function ConnectionIndicator({ quality, isLive, tick }: ConnectionIndicatorProps) {
  const config = QUALITY_CONFIG[quality];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-4 top-20 z-20"
    >
      <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-3.5 py-2 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        <span className="relative flex h-2 w-2">
          {isLive && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: config.color }}
            />
          )}
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: isLive ? config.color : "hsl(215 16% 47%)" }}
          />
        </span>

        <span className="text-xs font-medium text-white/80">
          {isLive ? "Live" : "Paused"}
        </span>

        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map((level) => (
            <motion.div
              key={level}
              animate={{ height: level <= config.bars ? [4, 8, 4] : 3 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: level * 0.1,
                ease: "easeInOut",
              }}
              className={cn("w-0.5 rounded-full")}
              style={{
                background: level <= config.bars ? config.color : "hsl(215 16% 30%)",
                height: level <= config.bars ? 8 : 3,
              }}
            />
          ))}
        </div>

        <span className="text-[10px] text-white/40">{config.label}</span>

        <span className="ml-1 tabular-nums text-[10px] text-white/30">
          {tick}s
        </span>
      </div>
    </motion.div>
  );
}
