"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

interface AnimatedKpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  accentColor: string;
  index?: number;
}

export function AnimatedKpiCard({
  label,
  value,
  suffix = "",
  prefix = "",
  change,
  trend = "neutral",
  icon: Icon,
  accentColor,
  index = 0,
}: AnimatedKpiCardProps) {
  const animatedValue = useCountUp(value, 1400, true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.15]"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${accentColor}1a` }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}
