import type { AIResponse, ReasoningStep, RichCard } from "./types";

type IntentType =
  | "offline_vehicles"
  | "zone_vehicles"
  | "replay_routes"
  | "speed_violations"
  | "weekly_report"
  | "compare_weeks"
  | "idle_drivers"
  | "delayed_deliveries"
  | "inefficient_routes"
  | "operations_summary"
  | "battery_status"
  | "unknown";

interface IntentDef {
  type: IntentType;
  label: string;
  patterns: RegExp[];
  keywords: string[];
}

const INTENTS: IntentDef[] = [
  {
    type: "offline_vehicles",
    label: "Offline vehicle lookup",
    patterns: [/offline/i, /disconnected/i, /down.*vehicle/i, /lost.*signal/i],
    keywords: ["offline", "disconnected", "down", "lost"],
  },
  {
    type: "zone_vehicles",
    label: "Geofence zone query",
    patterns: [/inside.*zone/i, /zone\s+[a-z]/i, /geofence/i, /within.*area/i],
    keywords: ["zone", "geofence", "area", "inside", "within"],
  },
  {
    type: "replay_routes",
    label: "Route replay",
    patterns: [/replay.*route/i, /playback/i, /today.*route/i, /route.*today/i],
    keywords: ["replay", "playback", "route", "trip"],
  },
  {
    type: "speed_violations",
    label: "Speed violation analysis",
    patterns: [/exceed.*\d+/i, /speed.*violat/i, /over.*km\/?h/i, /speeding/i],
    keywords: ["speed", "exceeded", "violation", "fast", "km/h"],
  },
  {
    type: "weekly_report",
    label: "Weekly operations report",
    patterns: [/weekly.*report/i, /week.*report/i, /executive.*report/i, /report.*week/i],
    keywords: ["weekly", "report", "executive", "summary"],
  },
  {
    type: "compare_weeks",
    label: "Week-over-week comparison",
    patterns: [/compare.*week/i, /this.*week.*last/i, /vs.*last.*week/i, /week.*over.*week/i],
    keywords: ["compare", "week", "last", "previous", "vs"],
  },
  {
    type: "idle_drivers",
    label: "Idle driver identification",
    patterns: [/idle.*driver/i, /driver.*idle/i, /who.*idle/i, /stopped.*driver/i],
    keywords: ["idle", "stopped", "parked", "waiting"],
  },
  {
    type: "delayed_deliveries",
    label: "Delayed delivery tracking",
    patterns: [/delayed.*deliver/i, /behind.*schedule/i, /late.*deliver/i],
    keywords: ["delayed", "late", "behind", "schedule", "delivery"],
  },
  {
    type: "inefficient_routes",
    label: "Route efficiency analysis",
    patterns: [/inefficient/i, /optimize.*route/i, /route.*optim/i, /wast.*route/i],
    keywords: ["inefficient", "optimize", "waste", "detour", "efficiency"],
  },
  {
    type: "operations_summary",
    label: "Operations summary",
    patterns: [/summarize.*operation/i, /today.*operation/i, /operation.*summary/i, /fleet.*summary/i],
    keywords: ["summarize", "summary", "operations", "fleet", "today"],
  },
  {
    type: "battery_status",
    label: "Battery status check",
    patterns: [/battery/i, /charge.*level/i, /power.*level/i],
    keywords: ["battery", "charge", "power", "level"],
  },
];

export function classifyIntent(query: string): IntentDef | null {
  const q = query.toLowerCase().trim();
  if (q.length < 4) return null;

  let best: { def: IntentDef; score: number } | null = null;

  for (const def of INTENTS) {
    let score = 0;
    for (const pattern of def.patterns) {
      if (pattern.test(query)) score += 3;
    }
    for (const kw of def.keywords) {
      if (q.includes(kw)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { def, score };
    }
  }

  return best ? best.def : null;
}

export function isAIQuery(query: string): boolean {
  const q = query.trim();
  if (q.length < 4) return false;

  const aiPatterns = [
    /^(show|find|list|get|display|locate)\s/i,
    /^(who|which|what|where|when|how|why)\b/i,
    /\b(replay|generate|compare|summarize|suggest|optimize|analyze)\b/i,
    /\b(today|this week|last week|yesterday)\b/i,
    /\b(offline|idle|delayed|inefficient|exceeded)\b/i,
    /\b(zone\s+[a-z]|geofence)\b/i,
    /\b\d+\s*(km\/?h|mph)\b/i,
  ];

  return aiPatterns.some((p) => p.test(q));
}

function buildReasoningSteps(intent: IntentType): ReasoningStep[] {
  const base: Record<IntentType, string[]> = {
    offline_vehicles: ["Querying device status", "Filtering offline devices", "Compiling results"],
    zone_vehicles: ["Loading geofence zones", "Checking vehicle positions", "Matching Zone A boundary"],
    replay_routes: ["Fetching GPS history", "Building route timelines", "Preparing playback"],
    speed_violations: ["Scanning speed logs", "Filtering violations", "Ranking by severity"],
    weekly_report: ["Aggregating weekly metrics", "Calculating trends", "Generating report"],
    compare_weeks: ["Loading this week's data", "Loading last week's data", "Computing deltas"],
    idle_drivers: ["Analyzing idle periods", "Cross-referencing drivers", "Ranking by idle time"],
    delayed_deliveries: ["Checking delivery schedules", "Comparing ETA vs actual", "Flagging delays"],
    inefficient_routes: ["Analyzing route paths", "Detecting detours", "Calculating waste"],
    operations_summary: ["Gathering fleet metrics", "Analyzing patterns", "Synthesizing summary"],
    battery_status: ["Reading battery telemetry", "Ranking by level", "Flagging low batteries"],
    unknown: ["Processing query"],
  };

  return (base[intent] ?? base.unknown).map((label) => ({ label, status: "pending" as const }));
}

function buildCards(intent: IntentType): RichCard[] {
  switch (intent) {
    case "offline_vehicles":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Offline Vehicles", value: 4, trend: "up", trendValue: "+1", icon: "alert" },
            { label: "Last Seen", value: "2.3h", unit: "avg", icon: "clock" },
            { label: "Affected Routes", value: 3, icon: "route" },
            { label: "Signal Lost", value: "12:40", icon: "signal" },
          ],
        },
        {
          type: "data-table",
          title: "Offline Vehicles",
          columns: [
            { key: "id", label: "Vehicle" },
            { key: "driver", label: "Driver" },
            { key: "lastSeen", label: "Last Seen", align: "right" },
            { key: "battery", label: "Battery", align: "right" },
          ],
          rows: [
            { id: "TRK-004", driver: "Emma Davis", lastSeen: "3h 12m ago", battery: "12%" },
            { id: "VAN-007", driver: "Tom Brucker", lastSeen: "2h 45m ago", battery: "8%" },
            { id: "TRK-012", driver: "Lisa Park", lastSeen: "1h 20m ago", battery: "24%" },
            { id: "CAR-019", driver: "John Smith", lastSeen: "45m ago", battery: "31%" },
          ],
        },
      ];

    case "zone_vehicles":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "In Zone A", value: 7, icon: "map" },
            { label: "Moving", value: 5, icon: "activity" },
            { label: "Idle", value: 2, icon: "clock" },
            { label: "Entered (1h)", value: 3, trend: "up", trendValue: "+2", icon: "enter" },
          ],
        },
        {
          type: "mini-map",
          title: "Zone A — Live Positions",
          zone: "Zone A",
          vehicles: [
            { id: "TRK-001", x: 35, y: 28, status: "moving" },
            { id: "TRK-003", x: 62, y: 45, status: "moving" },
            { id: "VAN-005", x: 48, y: 62, status: "idle" },
            { id: "TRK-008", x: 25, y: 55, status: "moving" },
            { id: "CAR-011", x: 70, y: 30, status: "moving" },
            { id: "TRK-014", x: 55, y: 70, status: "idle" },
            { id: "VAN-018", x: 40, y: 40, status: "moving" },
          ],
        },
        {
          type: "data-table",
          title: "Vehicles Inside Zone A",
          columns: [
            { key: "id", label: "Vehicle" },
            { key: "status", label: "Status" },
            { key: "speed", label: "Speed", align: "right" },
            { key: "entered", label: "Entered", align: "right" },
          ],
          rows: [
            { id: "TRK-001", status: "Moving", speed: "52 km/h", entered: "8m ago" },
            { id: "TRK-003", status: "Moving", speed: "38 km/h", entered: "15m ago" },
            { id: "VAN-005", status: "Idle", speed: "0 km/h", entered: "42m ago" },
            { id: "TRK-008", status: "Moving", speed: "61 km/h", entered: "3m ago" },
            { id: "CAR-011", status: "Moving", speed: "44 km/h", entered: "22m ago" },
            { id: "TRK-014", status: "Idle", speed: "0 km/h", entered: "1h ago" },
            { id: "VAN-018", status: "Moving", speed: "29 km/h", entered: "6m ago" },
          ],
        },
      ];

    case "replay_routes":
      return [
        {
          type: "route-timeline",
          title: "Today's Routes",
          routes: [
            {
              vehicleId: "TRK-001",
              driver: "James Wilson",
              stops: [
                { time: "08:15", location: "Depot — 340 Mission St", type: "start" },
                { time: "09:42", location: "Stop 1 — 88 Battery St", type: "stop" },
                { time: "11:30", location: "Stop 2 — 555 California St", type: "stop" },
                { time: "13:05", location: "Stop 3 — 1 Ferry Building", type: "stop" },
                { time: "15:20", location: "Return — Depot", type: "end" },
              ],
            },
            {
              vehicleId: "VAN-003",
              driver: "Mike Rodriguez",
              stops: [
                { time: "07:50", location: "Depot — 340 Mission St", type: "start" },
                { time: "10:15", location: "Stop 1 — 1455 Market St", type: "stop" },
                { time: "12:40", location: "Stop 2 — 680 Folsom St", type: "stop" },
                { time: "14:55", location: "Return — Depot", type: "end" },
              ],
            },
          ],
        },
      ];

    case "speed_violations":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Violations", value: 6, trend: "down", trendValue: "-2", icon: "gauge" },
            { label: "Max Speed", value: 94, unit: "km/h", icon: "alert" },
            { label: "Avg Over", value: 12, unit: "km/h", icon: "trend" },
            { label: "Worst Zone", value: "I-280 N", icon: "map" },
          ],
        },
        {
          type: "bar-chart",
          title: "Speed Violations by Vehicle",
          unit: "km/h over limit",
          maxValue: 25,
          bars: [
            { label: "TRK-001", value: 14, color: "warning" },
            { label: "CAR-005", value: 22, color: "danger" },
            { label: "TRK-008", value: 8, color: "warning" },
            { label: "VAN-003", value: 11, color: "warning" },
            { label: "TRK-014", value: 17, color: "danger" },
            { label: "CAR-011", value: 5, color: "warning" },
          ],
        },
        {
          type: "data-table",
          title: "Violation Details",
          columns: [
            { key: "id", label: "Vehicle" },
            { key: "driver", label: "Driver" },
            { key: "speed", label: "Speed", align: "right" },
            { key: "location", label: "Location" },
            { key: "time", label: "Time", align: "right" },
          ],
          rows: [
            { id: "CAR-005", driver: "Alex Kim", speed: "94 km/h", location: "I-280 N", time: "14:32" },
            { id: "TRK-014", driver: "Lisa Park", speed: "89 km/h", location: "US-101 S", time: "11:18" },
            { id: "TRK-001", driver: "James Wilson", speed: "86 km/h", location: "I-280 N", time: "09:45" },
            { id: "VAN-003", driver: "Mike Rodriguez", speed: "83 km/h", location: "Bay Bridge", time: "10:22" },
            { id: "TRK-008", driver: "Tom Brucker", speed: "80 km/h", location: "US-101 S", time: "13:05" },
            { id: "CAR-011", driver: "John Smith", speed: "79 km/h", location: "I-280 S", time: "15:40" },
          ],
        },
      ];

    case "weekly_report":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Total Trips", value: 412, trend: "up", trendValue: "+8%", icon: "route" },
            { label: "Distance", value: "18,240", unit: "km", trend: "up", trendValue: "+5%", icon: "map" },
            { label: "Fuel Used", value: "2,140", unit: "L", trend: "down", trendValue: "-3%", icon: "fuel" },
            { label: "On-Time", value: "94%", trend: "up", trendValue: "+2%", icon: "check" },
          ],
        },
        {
          type: "bar-chart",
          title: "Trips by Day",
          unit: "trips",
          maxValue: 80,
          bars: [
            { label: "Mon", value: 62 },
            { label: "Tue", value: 71 },
            { label: "Wed", value: 58 },
            { label: "Thu", value: 74 },
            { label: "Fri", value: 68 },
            { label: "Sat", value: 45 },
            { label: "Sun", value: 34 },
          ],
        },
        {
          type: "summary-card",
          sections: [
            { heading: "Highlights", body: "Fleet utilization reached 87% this week, up 8% from last week. Thursday was the busiest day with 74 trips completed." },
            { heading: "Areas of Concern", body: "3 vehicles flagged for excessive idle time (>40 min/day). 6 speed violations recorded, down 2 from last week. TRK-004 has been offline for 3+ hours." },
            { heading: "Recommendations", body: "Review idle policies for TRK-002 and VAN-005. Schedule maintenance for CAR-005 (battery at 12%). Consider route optimization for I-280 N corridor." },
          ],
        },
      ];

    case "compare_weeks":
      return [
        {
          type: "comparison",
          chart: [
            { label: "Trips", current: 412, previous: 381 },
            { label: "Distance (km)", current: 18240, previous: 17120 },
            { label: "On-Time %", current: 94, previous: 91 },
            { label: "Violations", current: 6, previous: 8 },
            { label: "Idle Hours", current: 28, previous: 35 },
          ],
          periods: [
            {
              label: "This Week",
              stats: [
                { label: "Trips", value: 412, trend: "up", trendValue: "+8%" },
                { label: "Distance", value: "18,240 km", trend: "up", trendValue: "+7%" },
                { label: "On-Time", value: "94%", trend: "up", trendValue: "+3%" },
                { label: "Violations", value: 6, trend: "down", trendValue: "-25%" },
              ],
            },
            {
              label: "Last Week",
              stats: [
                { label: "Trips", value: 381 },
                { label: "Distance", value: "17,120 km" },
                { label: "On-Time", value: "91%" },
                { label: "Violations", value: 8 },
              ],
            },
          ],
        },
      ];

    case "idle_drivers":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Idle Drivers", value: 5, trend: "up", trendValue: "+1", icon: "clock" },
            { label: "Total Idle", value: "3.2h", icon: "clock" },
            { label: "Worst", value: "Sarah Chen", icon: "alert" },
            { label: "Fuel Waste", value: "8.4L", icon: "fuel" },
          ],
        },
        {
          type: "bar-chart",
          title: "Idle Time by Driver",
          unit: "minutes",
          maxValue: 60,
          bars: [
            { label: "S. Chen", value: 52, color: "danger" },
            { label: "M. Rodriguez", value: 38, color: "warning" },
            { label: "L. Park", value: 31, color: "warning" },
            { label: "J. Smith", value: 24, color: "warning" },
            { label: "T. Brucker", value: 18, color: "neutral" },
          ],
        },
      ];

    case "delayed_deliveries":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Delayed", value: 3, trend: "up", trendValue: "+1", icon: "alert" },
            { label: "Avg Delay", value: "47min", icon: "clock" },
            { label: "At Risk", value: 2, icon: "warning" },
            { label: "On-Time", value: "91%", trend: "down", trendValue: "-3%", icon: "check" },
          ],
        },
        {
          type: "alert-list",
          alerts: [
            { severity: "danger", message: "Delivery #4821 running 1h 12m behind schedule", vehicleId: "TRK-001", time: "14:30" },
            { severity: "danger", message: "Delivery #4835 delayed by 52 minutes", vehicleId: "VAN-003", time: "13:55" },
            { severity: "warning", message: "Delivery #4840 at risk — ETA slipped by 28 min", vehicleId: "TRK-008", time: "15:10" },
            { severity: "warning", message: "Delivery #4842 approaching delay threshold", vehicleId: "CAR-011", time: "15:22" },
            { severity: "info", message: "Delivery #4830 recovered — back on schedule", vehicleId: "TRK-014", time: "14:45" },
          ],
        },
      ];

    case "inefficient_routes":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Inefficient", value: 4, icon: "route" },
            { label: "Extra Distance", value: "142km", icon: "map" },
            { label: "Fuel Waste", value: "12.8L", icon: "fuel" },
            { label: "Est. Savings", value: "$340", icon: "trend" },
          ],
        },
        {
          type: "data-table",
          title: "Routes with Optimization Potential",
          columns: [
            { key: "id", label: "Vehicle" },
            { key: "route", label: "Route" },
            { key: "extra", label: "Extra km", align: "right" },
            { key: "savings", label: "Potential", align: "right" },
          ],
          rows: [
            { id: "TRK-001", route: "Depot → Battery St → Ferry", extra: "48 km", savings: "$120" },
            { id: "VAN-003", route: "Depot → Market → Folsom", extra: "37 km", savings: "$95" },
            { id: "TRK-014", route: "Depot → SoMa → Mission", extra: "32 km", savings: "$80" },
            { id: "CAR-011", route: "Depot → Embarcadero", extra: "25 km", savings: "$45" },
          ],
        },
      ];

    case "operations_summary":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Active Vehicles", value: 142, icon: "truck" },
            { label: "Online", value: 138, icon: "activity" },
            { label: "Alerts", value: 7, trend: "down", trendValue: "-3", icon: "alert" },
            { label: "Avg Speed", value: "52 km/h", icon: "gauge" },
          ],
        },
        {
          type: "summary-card",
          sections: [
            { heading: "Today's Operations", body: "142 vehicles active across 8 zones. Fleet utilization at 87%. 412 trips completed with 94% on-time delivery rate." },
            { heading: "Key Events", body: "6 speed violations detected (down 2 from yesterday). 3 deliveries running behind schedule. TRK-004 offline for 3+ hours — battery critically low." },
            { heading: "Action Items", body: "Review idle time for 5 drivers exceeding 30 min. Schedule maintenance for 2 low-battery vehicles. Optimize 4 routes showing inefficiency." },
          ],
        },
      ];

    case "battery_status":
      return [
        {
          type: "stat-grid",
          stats: [
            { label: "Critical", value: 2, trend: "up", trendValue: "+1", icon: "alert" },
            { label: "Low", value: 5, icon: "warning" },
            { label: "Healthy", value: 131, icon: "check" },
            { label: "Avg Level", value: "78%", icon: "battery" },
          ],
        },
        {
          type: "data-table",
          title: "Low Battery Vehicles",
          columns: [
            { key: "id", label: "Vehicle" },
            { key: "driver", label: "Driver" },
            { key: "battery", label: "Battery", align: "right" },
            { key: "status", label: "Status" },
          ],
          rows: [
            { id: "TRK-004", driver: "Emma Davis", battery: "12%", status: "Critical" },
            { id: "VAN-007", driver: "Tom Brucker", battery: "8%", status: "Critical" },
            { id: "TRK-012", driver: "Lisa Park", battery: "24%", status: "Low" },
            { id: "CAR-019", driver: "John Smith", battery: "31%", status: "Low" },
            { id: "VAN-005", driver: "Sarah Chen", battery: "45%", status: "Low" },
          ],
        },
      ];

    default:
      return [
        {
          type: "summary-card",
          sections: [
            { heading: "Query", body: "I couldn't classify this query. Try asking about offline vehicles, speed violations, zone activity, or weekly reports." },
          ],
        },
      ];
  }
}

function buildSummary(intent: IntentType): string {
  const summaries: Record<IntentType, string> = {
    offline_vehicles: "Found 4 offline vehicles. TRK-004 has been offline the longest at 3h 12m with critical battery at 12%.",
    zone_vehicles: "7 vehicles currently inside Zone A. 5 are moving, 2 are idle. 3 vehicles entered in the last hour.",
    replay_routes: "Loaded today's routes for 2 vehicles. TRK-001 completed 4 stops over 7 hours. VAN-003 completed 3 stops.",
    speed_violations: "6 speed violations recorded today, down 2 from yesterday. CAR-005 was the worst offender at 94 km/h.",
    weekly_report: "This week: 412 trips (+8%), 18,240 km traveled, 94% on-time delivery. 6 speed violations, 3 delayed deliveries.",
    compare_weeks: "This week outperformed last week across all key metrics. Trips up 8%, on-time up 3%, violations down 25%.",
    idle_drivers: "5 drivers flagged for excessive idle time. Sarah Chen leads with 52 minutes, wasting an estimated 8.4L of fuel.",
    delayed_deliveries: "3 deliveries currently delayed by an average of 47 minutes. 2 more at risk of falling behind.",
    inefficient_routes: "4 routes show optimization potential. Combined extra distance is 142 km, costing an estimated $340 in fuel.",
    operations_summary: "142 vehicles active, 138 online. 412 trips completed at 94% on-time rate. 7 active alerts, 6 speed violations.",
    battery_status: "2 vehicles at critical battery levels, 5 at low. Average fleet battery is 78%. TRK-004 and VAN-007 need immediate charging.",
    unknown: "I can help with offline vehicles, zone queries, speed violations, route replays, weekly reports, and fleet comparisons.",
  };
  return summaries[intent] ?? summaries.unknown;
}

export function generateAIResponse(query: string): AIResponse {
  const intentDef = classifyIntent(query);
  const intent = intentDef?.type ?? "unknown";

  return {
    query,
    intent: intentDef?.label ?? "General query",
    summary: buildSummary(intent),
    reasoningSteps: buildReasoningSteps(intent),
    cards: buildCards(intent),
  };
}
