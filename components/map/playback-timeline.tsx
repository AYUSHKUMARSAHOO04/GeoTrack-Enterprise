"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybackTimelineProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  onProgressChange: (progress: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  currentTime: string;
  totalTime: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export function PlaybackTimeline({
  isPlaying,
  onPlayPause,
  progress,
  onProgressChange,
  speed,
  onSpeedChange,
  currentTime,
  totalTime,
}: PlaybackTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onProgressChange(Math.max(0, Math.min(100, pct)));
    },
    [onProgressChange]
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onProgressChange(Math.max(0, Math.min(100, pct)));
    },
    [onProgressChange]
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => onProgressChange(0)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onSpeedChange(Math.max(0.5, speed / 2))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Rewind className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            onClick={() => onSpeedChange(Math.min(8, speed * 2))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <FastForward className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onProgressChange(100)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1">
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            onMouseMove={handleDrag}
            onMouseDown={() => (isDragging.current = true)}
            onMouseUp={() => (isDragging.current = false)}
            onMouseLeave={() => (isDragging.current = false)}
            className="group relative h-1.5 cursor-pointer rounded-full bg-white/10"
          >
            <motion.div
              className="absolute h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-md"
              style={{ left: `${progress}%` }}
              whileHover={{ scale: 1.2 }}
            />
            <div
              className="absolute -top-1 h-3.5 w-full cursor-pointer opacity-0"
              style={{ pointerEvents: "auto" }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium tabular-nums text-white/60">{currentTime}</span>
            <span className="text-[10px] tabular-nums text-white/30">{totalTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                "rounded-md px-1.5 py-1 text-[10px] font-medium tabular-nums transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
