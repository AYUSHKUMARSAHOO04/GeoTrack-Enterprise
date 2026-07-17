import {
  LayoutDashboard,
  BarChart3,
  Map,
  Cpu,
  Bell,
  FileText,
  Settings,
  Building2,
  Users,
  UserPlus,
  Plus,
  Download,
  Play,
  FileBarChart,
  MapPin,
  CircleDot,
  Battery,
  Gauge,
  Route,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Brain,
  Zap,
  Activity,
  Truck,
  Clock,
  Calendar,
  MapPinned,
  type LucideIcon,
} from "lucide-react";
import type { Command, CommandCategory } from "./types";

export interface CommandContext {
  navigate: (path: string) => void;
  showToast: (message: string, icon?: LucideIcon) => void;
}

const navCommands: Pick<
  Command,
  "id" | "title" | "description" | "category" | "icon" | "shortcut" | "keywords"
>[] = [
  { id: "nav-dashboard", title: "Open Dashboard", description: "Go to the main dashboard", category: "Navigation", icon: LayoutDashboard, shortcut: ["G", "D"], keywords: ["home", "overview", "main"] },
  { id: "nav-analytics", title: "Open Analytics", description: "View fleet analytics and reports", category: "Navigation", icon: BarChart3, shortcut: ["G", "A"], keywords: ["stats", "metrics", "insights"] },
  { id: "nav-map", title: "Open Live Map", description: "Real-time vehicle tracking map", category: "Navigation", icon: Map, shortcut: ["G", "M"], keywords: ["tracking", "live", "realtime", "fleet"] },
  { id: "nav-devices", title: "Open Devices", description: "Manage all tracked devices", category: "Navigation", icon: Cpu, shortcut: ["G", "V"], keywords: ["vehicles", "trackers", "hardware"] },
  { id: "nav-alerts", title: "Open Alerts", description: "View active alerts and notifications", category: "Navigation", icon: Bell, shortcut: ["G", "L"], keywords: ["warnings", "notifications", "alarms"] },
  { id: "nav-reports", title: "Open Reports", description: "Browse and generate reports", category: "Navigation", icon: FileText, shortcut: ["G", "R"], keywords: ["documents", "exports", "summaries"] },
  { id: "nav-settings", title: "Open Settings", description: "Application and account settings", category: "Navigation", icon: Settings, shortcut: ["G", "S"], keywords: ["preferences", "config", "configuration"] },
  { id: "nav-organizations", title: "Open Organizations", description: "Manage organizations", category: "Navigation", icon: Building2, shortcut: ["G", "O"], keywords: ["company", "companies", "tenants"] },
  { id: "nav-teams", title: "Open Teams", description: "Manage teams and permissions", category: "Navigation", icon: Users, shortcut: ["G", "T"], keywords: ["groups", "departments"] },
];

const actionCommands: Pick<
  Command,
  "id" | "title" | "description" | "category" | "icon" | "shortcut" | "keywords"
>[] = [
  { id: "act-create-device", title: "Create Device", description: "Register a new tracking device", category: "Actions", icon: Plus, shortcut: ["C", "D"], keywords: ["add", "new", "register", "vehicle"] },
  { id: "act-add-user", title: "Add User", description: "Invite a new team member", category: "Actions", icon: UserPlus, shortcut: ["C", "U"], keywords: ["invite", "member", "team"] },
  { id: "act-create-team", title: "Create Team", description: "Create a new team group", category: "Actions", icon: Users, shortcut: ["C", "T"], keywords: ["group", "department"] },
  { id: "act-export-csv", title: "Export CSV", description: "Export current view as CSV", category: "Actions", icon: Download, shortcut: ["E", "X"], keywords: ["download", "spreadsheet", "data"] },
  { id: "act-replay-route", title: "Replay Route", description: "Replay a vehicle's route history", category: "Actions", icon: Play, shortcut: ["R", "P"], keywords: ["playback", "history", "timeline"] },
  { id: "act-generate-report", title: "Generate Report", description: "Create a custom report", category: "Actions", icon: FileBarChart, shortcut: ["C", "R"], keywords: ["document", "summary", "export"] },
  { id: "act-create-geofence", title: "Create Geofence", description: "Draw a new geofence zone", category: "Actions", icon: MapPin, shortcut: ["C", "G"], keywords: ["zone", "area", "boundary", "fence"] },
];

const deviceCommands: Pick<
  Command,
  "id" | "title" | "description" | "category" | "icon" | "shortcut" | "keywords"
>[] = [
  { id: "dev-online", title: "Show Online Devices", description: "Filter to connected devices", category: "Devices", icon: CircleDot, keywords: ["active", "connected", "live"] },
  { id: "dev-offline", title: "Show Offline Devices", description: "Filter to disconnected devices", category: "Devices", icon: CircleDot, keywords: ["disconnected", "lost", "down"] },
  { id: "dev-locate-102", title: "Locate Device 102", description: "Find Device 102 on the map", category: "Devices", icon: MapPin, keywords: ["find", "track", "102"] },
  { id: "dev-track-45", title: "Track Device 45", description: "Start live tracking for Device 45", category: "Devices", icon: Map, keywords: ["follow", "live", "45"] },
  { id: "dev-replay-today", title: "Replay Today's Trip", description: "Playback today's route for selected device", category: "Devices", icon: Play, keywords: ["history", "playback", "route"] },
  { id: "dev-battery", title: "Show Battery Status", description: "View battery levels for all devices", category: "Devices", icon: Battery, keywords: ["power", "charge", "level"] },
];

const analyticsCommands: Pick<
  Command,
  "id" | "title" | "description" | "category" | "icon" | "shortcut" | "keywords"
>[] = [
  { id: "ana-daily", title: "Daily Report", description: "View today's fleet activity", category: "Analytics", icon: Calendar, keywords: ["today", "summary", "24h"] },
  { id: "ana-weekly", title: "Weekly Report", description: "View this week's fleet summary", category: "Analytics", icon: Calendar, keywords: ["week", "7 days", "summary"] },
  { id: "ana-idle", title: "Idle Vehicles", description: "Show vehicles with excessive idle time", category: "Analytics", icon: Clock, keywords: ["stopped", "parked", "waiting", "idle"] },
  { id: "ana-speed", title: "Speed Violations", description: "Show speed limit violations", category: "Analytics", icon: Gauge, keywords: ["fast", "over", "limit", "speeding"] },
  { id: "ana-longest", title: "Longest Trips", description: "Rank trips by distance", category: "Analytics", icon: Route, keywords: ["distance", "far", "long", "trips"] },
  { id: "ana-active-drivers", title: "Most Active Drivers", description: "Rank drivers by activity", category: "Analytics", icon: TrendingUp, keywords: ["drivers", "active", "top", "ranking"] },
  { id: "ana-top-routes", title: "Top Routes", description: "Most frequently traveled routes", category: "Analytics", icon: Route, keywords: ["popular", "frequent", "common"] },
  { id: "ana-heatmap", title: "Heatmap", description: "Show activity heatmap overlay", category: "Analytics", icon: Activity, keywords: ["density", "hot", "zones", "heat"] },
];

const aiCommands: Pick<
  Command,
  "id" | "title" | "description" | "category" | "icon" | "shortcut" | "keywords"
>[] = [
  { id: "ai-idle-today", title: "Which drivers were idle today?", description: "AI: Identify idle drivers from today's data", category: "AI", icon: Sparkles, keywords: ["idle", "drivers", "today", "who", "stopped"] },
  { id: "ai-delayed", title: "Show delayed deliveries", description: "AI: Find deliveries running behind schedule", category: "AI", icon: AlertTriangle, keywords: ["delayed", "late", "behind", "schedule"] },
  { id: "ai-zone-a", title: "Find vehicles inside Zone A", description: "AI: Locate vehicles within Zone A geofence", category: "AI", icon: MapPinned, keywords: ["zone", "geofence", "inside", "area"] },
  { id: "ai-speed-80", title: "Who exceeded 80 km/h?", description: "AI: Find speed limit violations over 80 km/h", category: "AI", icon: Gauge, keywords: ["speed", "exceeded", "over", "fast", "80"] },
  { id: "ai-summarize", title: "Summarize today's operations", description: "AI: Generate executive summary of today's fleet", category: "AI", icon: Brain, keywords: ["summarize", "summary", "operations", "today"] },
  { id: "ai-inefficient", title: "Show inefficient routes", description: "AI: Identify routes with optimization potential", category: "AI", icon: Zap, keywords: ["inefficient", "optimize", "waste", "detour"] },
  { id: "ai-exec-report", title: "Generate weekly executive report", description: "AI: Create executive-ready weekly summary", category: "AI", icon: FileBarChart, keywords: ["executive", "weekly", "report", "generate"] },
  { id: "ai-suggest-routes", title: "Suggest route optimizations", description: "AI: Recommend more efficient route plans", category: "AI", icon: Sparkles, keywords: ["suggest", "optimize", "improve", "routes"] },
];

const allCommandDefs = [
  ...navCommands,
  ...actionCommands,
  ...deviceCommands,
  ...analyticsCommands,
  ...aiCommands,
];

export function buildCommands(ctx: CommandContext): Command[] {
  return allCommandDefs.map((def) => {
    const Icon = def.icon;
    return {
      ...def,
      action: () => {
        if (def.id.startsWith("nav-")) {
          const slug = def.id.replace("nav-", "");
          ctx.navigate(`/${slug.replace("-", "/")}`);
          ctx.showToast(`Navigated to ${def.title}`, Icon);
        } else {
          ctx.showToast(`${def.title} executed`, Icon);
        }
      },
    } as Command;
  });
}

export const CATEGORY_ORDER: CommandCategory[] = [
  "Navigation",
  "Actions",
  "Devices",
  "Analytics",
  "AI",
  "Trips",
  "Alerts",
  "Geofences",
  "Reports",
  "Exports",
  "Teams",
  "Users",
  "Organizations",
  "Settings",
];

export const CATEGORY_ICONS: Record<CommandCategory, LucideIcon> = {
  Navigation: Map,
  Actions: Zap,
  Devices: Truck,
  Analytics: BarChart3,
  AI: Brain,
  Trips: Route,
  Alerts: Bell,
  Settings: Settings,
  Organizations: Building2,
  Teams: Users,
  Users: UserPlus,
  Geofences: MapPinned,
  Exports: Download,
  Reports: FileText,
};
