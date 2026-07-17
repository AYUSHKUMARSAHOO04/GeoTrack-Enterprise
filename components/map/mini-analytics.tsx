"use client";

import { motion } from "framer-motion";
import { Activity, Radio, AlertTriangle, Route, TrendingUp } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import type { Vehicle } from "@/hooks/use-live-map";

interface MiniAnalyticsProps {
  vehicles: Vehicle[];
  tick: number;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  const animated = useCountUp(value, 800, true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}1a` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div>
        <div className="text-base font-semibold tabular-nums text-white">{animated}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      </div>
    </motion.div>
  );
}

export function MiniAnalytics({ vehicles, tick }: MiniAnalyticsProps) {
  const moving = vehicles.filter((v) => v.status === "moving").length;
  const idle = vehicles.filter((v) => v.status === "idle").length;
  const offline = vehicles.filter((v) => v.status === "offline").length;
  const alerts = vehicles.filter((v) => v.battery < 20).length;
  const totalDistance = vehicles.reduce((sum, v) => sum + Math.floor(v.speed * 0.1), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-4 bottom-24 z-20"
    >
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        <MiniStat icon={Radio} label="Moving" value={moving} color="hsl(142 71% 45%)" delay={0.3} />
        <div className="h-8 w-px bg-white/10" />
        <MiniStat icon={Activity} label="Idle" value={idle} color="hsl(38 92% 50%)" delay={0.35} />
        <div className="h-8 w-px bg-white/10" />
        <MiniStat icon={AlertTriangle} label="Alerts" value={alerts} color="hsl(0 84% 60%)" delay={0.4} />
        <div className="h-8 w-px bg-white/10" />
        <MiniStat icon={Route} label="km Today" value={totalDistance} color="hsl(199 89% 48%)" delay={0.45} />
      </div>
      <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-white/30">
        <TrendingUp className="h-2.5 w-2.5" />
        Updated {tick}s ago
      </div>
    </motion.div>
  );
}
