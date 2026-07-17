import type { LucideIcon } from "lucide-react";

export type CommandCategory =
  | "Navigation"
  | "Actions"
  | "Devices"
  | "Analytics"
  | "AI"
  | "Trips"
  | "Alerts"
  | "Settings"
  | "Organizations"
  | "Teams"
  | "Users"
  | "Geofences"
  | "Exports"
  | "Reports";

export type CommandStatus = "normal" | "success" | "danger";

export interface Command {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string[];
  keywords?: string[];
  action: () => void | Promise<void>;
  status?: CommandStatus;
  preview?: string;
  aiQuery?: boolean;
}

export interface CommandResult extends Command {
  score: number;
  matchedIndices: number[];
}

export interface RecentCommandEntry {
  id: string;
  title: string;
  category: CommandCategory;
  timestamp: number;
}

export type PaletteMode = "command" | "ai";

export type RichCardType =
  | "stat-grid"
  | "data-table"
  | "bar-chart"
  | "mini-map"
  | "comparison"
  | "route-timeline"
  | "alert-list"
  | "summary-card";

export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: string;
}

export interface RichCardBase {
  type: RichCardType;
  title?: string;
}

export interface StatGridCard extends RichCardBase {
  type: "stat-grid";
  stats: StatItem[];
}

export interface DataTableCard extends RichCardBase {
  type: "data-table";
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, string | number>[];
}

export interface BarChartCard extends RichCardBase {
  type: "bar-chart";
  bars: { label: string; value: number; color?: string }[];
  unit?: string;
  maxValue?: number;
}

export interface MiniMapCard extends RichCardBase {
  type: "mini-map";
  zone?: string;
  vehicles: { id: string; x: number; y: number; status: "moving" | "idle" | "offline" }[];
}

export interface ComparisonCard extends RichCardBase {
  type: "comparison";
  periods: { label: string; stats: StatItem[] }[];
  chart: { label: string; current: number; previous: number }[];
}

export interface RouteTimelineCard extends RichCardBase {
  type: "route-timeline";
  routes: {
    vehicleId: string;
    driver: string;
    stops: { time: string; location: string; type: "start" | "stop" | "end" }[];
  }[];
}

export interface AlertListCard extends RichCardBase {
  type: "alert-list";
  alerts: { severity: "warning" | "danger" | "info"; message: string; vehicleId: string; time: string }[];
}

export interface SummaryCard extends RichCardBase {
  type: "summary-card";
  sections: { heading: string; body: string }[];
}

export type RichCard =
  | StatGridCard
  | DataTableCard
  | BarChartCard
  | MiniMapCard
  | ComparisonCard
  | RouteTimelineCard
  | AlertListCard
  | SummaryCard;

export interface ReasoningStep {
  label: string;
  status: "pending" | "active" | "done";
}

export interface AIResponse {
  query: string;
  summary: string;
  reasoningSteps: ReasoningStep[];
  cards: RichCard[];
  intent: string;
}
