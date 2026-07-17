"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Route,
  Activity,
  MapPin,
  Truck,
  Gauge,
  Battery,
  CheckCircle,
  Fuel,
  Signal,
  ArrowDownToLine,
  type LucideIcon,
} from "lucide-react";
import type {
  RichCard,
  StatGridCard,
  DataTableCard,
  BarChartCard,
  MiniMapCard,
  ComparisonCard,
  RouteTimelineCard,
  AlertListCard,
  SummaryCard,
  StatItem,
} from "./types";

const ICON_MAP: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  clock: Clock,
  route: Route,
  signal: Signal,
  enter: ArrowDownToLine,
  map: MapPin,
  activity: Activity,
  gauge: Gauge,
  trend: TrendingUp,
  fuel: Fuel,
  check: CheckCircle,
  truck: Truck,
  battery: Battery,
  warning: AlertTriangle,
};

function TrendBadge({ trend, trendValue }: { trend?: StatItem["trend"]; trendValue?: string }) {
  if (!trend || trend === "neutral") {
    return trendValue ? (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        {trendValue}
      </span>
    ) : null;
  }
  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  const color = trend === "up" ? "text-success" : "text-destructive";
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="h-2.5 w-2.5" />
      {trendValue}
    </span>
  );
}

function StatGrid({ card }: { card: StatGridCard }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {card.stats.map((stat, i) => {
        const Icon = stat.icon ? ICON_MAP[stat.icon] ?? Activity : Activity;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-border bg-card/60 p-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-3 w-3" />
              </div>
              <TrendBadge trend={stat.trend} trendValue={stat.trendValue} />
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {stat.value}
              {stat.unit && <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{stat.unit}</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function DataTable({ card }: { card: DataTableCard }) {
  return (
    <div>
      {card.title && (
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {card.title}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-card/40">
              {card.columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2.5 py-1.5 font-medium text-muted-foreground ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="border-b border-border/50 last:border-0 hover:bg-muted/50"
              >
                {card.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2.5 py-1.5 text-muted-foreground ${
                      col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BarChart({ card }: { card: BarChartCard }) {
  const max = card.maxValue ?? Math.max(...card.bars.map((b) => b.value), 1);

  const colorMap: Record<string, string> = {
    danger: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
    accent: "bg-primary",
    neutral: "bg-muted-foreground",
  };

  return (
    <div>
      {card.title && (
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {card.title}
        </p>
      )}
      <div className="space-y-1.5 rounded-lg border border-border bg-card/40 p-3">
        {card.bars.map((bar, i) => {
          const widthPct = (bar.value / max) * 100;
          const color = bar.color ? colorMap[bar.color] ?? "bg-primary" : "bg-primary";
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
                {bar.label}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                <motion.div
                  className={`h-full rounded ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-foreground">
                {bar.value}
                {card.unit && <span className="text-muted-foreground"> {card.unit.split(" ")[0]}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniMap({ card }: { card: MiniMapCard }) {
  const statusColors: Record<string, string> = {
    moving: "bg-success",
    idle: "bg-warning",
    offline: "bg-muted-foreground",
  };

  return (
    <div>
      {card.title && (
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {card.title}
        </p>
      )}
      <div className="relative h-44 overflow-hidden rounded-lg border border-border bg-card/60">
        <div
          className="absolute inset-3 rounded-lg border-2 border-dashed border-primary/30"
          style={{
            background: "radial-gradient(circle at 50% 50%, hsl(199 89% 48% / 0.06), transparent 70%)",
          }}
        >
          <span className="absolute left-2 top-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary/60">
            {card.zone ?? "Zone"}
          </span>
        </div>
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(220 14% 22%)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {card.vehicles.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="absolute"
            style={{ left: `${v.x}%`, top: `${v.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${statusColors[v.status]} ring-2 ring-card/80`} />
            {v.status === "moving" && (
              <motion.div
                className={`absolute inset-0 rounded-full ${statusColors[v.status]}`}
                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              />
            )}
          </motion.div>
        ))}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md border border-border bg-card/80 px-2 py-1 text-[9px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Moving
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Idle
          </span>
        </div>
      </div>
    </div>
  );
}

function ComparisonView({ card }: { card: ComparisonCard }) {
  const maxVal = Math.max(...card.chart.flatMap((c) => [c.current, c.previous]), 1);

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {card.periods.map((period, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/40 p-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {period.label}
            </p>
            <div className="space-y-1">
              {period.stats.map((stat, j) => (
                <div key={j} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium tabular-nums text-foreground">{stat.value}</span>
                    <TrendBadge trend={stat.trend} trendValue={stat.trendValue} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
        {card.chart.map((item, i) => {
          const currentPct = (item.current / maxVal) * 100;
          const previousPct = (item.previous / maxVal) * 100;
          return (
            <div key={i}>
              <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
              <div className="mt-0.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[9px] text-primary">Now</span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded bg-muted">
                    <motion.div
                      className="h-full rounded bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[10px] font-medium tabular-nums text-foreground">
                    {item.current}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[9px] text-muted-foreground">Prev</span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded bg-muted">
                    <motion.div
                      className="h-full rounded bg-muted-foreground/50"
                      initial={{ width: 0 }}
                      animate={{ width: `${previousPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 + 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[10px] font-medium tabular-nums text-muted-foreground">
                    {item.previous}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RouteTimeline({ card }: { card: RouteTimelineCard }) {
  const stopIcons: Record<string, LucideIcon> = {
    start: MapPin,
    stop: Activity,
    end: CheckCircle,
  };
  const stopColors: Record<string, string> = {
    start: "text-primary bg-primary/15",
    stop: "text-muted-foreground bg-muted",
    end: "text-success bg-success/15",
  };

  return (
    <div>
      {card.title && (
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {card.title}
        </p>
      )}
      <div className="space-y-3">
        {card.routes.map((route, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-border bg-card/40 p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Truck className="h-3 w-3" />
              </div>
              <span className="text-[12px] font-medium text-foreground">{route.vehicleId}</span>
              <span className="text-[11px] text-muted-foreground">{route.driver}</span>
            </div>
            <div className="relative ml-3 border-l border-border pl-4">
              {route.stops.map((stop, j) => {
                const Icon = stopIcons[stop.type];
                return (
                  <div key={j} className="relative mb-2 last:mb-0">
                    <div
                      className={`absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full ${stopColors[stop.type]}`}
                    >
                      <Icon className="h-2 w-2" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                        {stop.time}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{stop.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AlertList({ card }: { card: AlertListCard }) {
  const severityConfig: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
    danger: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
    warning: { color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
    info: { color: "text-primary", bg: "bg-primary/10", icon: CheckCircle },
  };

  return (
    <div className="space-y-1.5">
      {card.alerts.map((alert, i) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`flex items-start gap-2.5 rounded-lg border border-border ${config.bg} p-2.5`}
          >
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-foreground">{alert.message}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-medium">{alert.vehicleId}</span>
                <span>•</span>
                <span>{alert.time}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SummaryCardView({ card }: { card: SummaryCard }) {
  return (
    <div className="space-y-3">
      {card.sections.map((section, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.08 }}
          className="rounded-lg border border-border bg-card/40 p-3"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {section.heading}
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{section.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function RichCardRenderer({ card }: { card: RichCard }) {
  switch (card.type) {
    case "stat-grid":
      return <StatGrid card={card} />;
    case "data-table":
      return <DataTable card={card} />;
    case "bar-chart":
      return <BarChart card={card} />;
    case "mini-map":
      return <MiniMap card={card} />;
    case "comparison":
      return <ComparisonView card={card} />;
    case "route-timeline":
      return <RouteTimeline card={card} />;
    case "alert-list":
      return <AlertList card={card} />;
    case "summary-card":
      return <SummaryCardView card={card} />;
    default:
      return null;
  }
}
