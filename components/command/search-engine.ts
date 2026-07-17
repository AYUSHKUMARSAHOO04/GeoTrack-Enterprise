import type { Command, CommandResult } from "./types";

function fuzzyMatch(query: string, target: string): { score: number; indices: number[] } {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return { score: 1000, indices: [...Array(t.length).keys()] };

  if (t.startsWith(q)) return { score: 900, indices: [...Array(q.length).keys()] };

  if (t.includes(q)) {
    const idx = t.indexOf(q);
    return {
      score: 800,
      indices: Array.from({ length: q.length }, (_, i) => idx + i),
    };
  }

  let qi = 0;
  let score = 0;
  let consecutive = 0;
  let firstMatch = -1;
  const indices: number[] = [];

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (firstMatch === -1) firstMatch = ti;
      consecutive++;
      score += 10 + consecutive * 5;
      indices.push(ti);
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return { score: 0, indices: [] };

  const earlyBonus = firstMatch === 0 ? 50 : Math.max(0, 30 - firstMatch);
  const gapPenalty = Math.floor((t.length - q.length) / 3);
  score += earlyBonus - gapPenalty;

  return { score: Math.max(score, 1), indices };
}

const INTENT_MAP: { patterns: RegExp; category: string; boost: number }[] = [
  { patterns: /\b(offline|down|lost|disconnected)\b/i, category: "offline", boost: 200 },
  { patterns: /\b(online|active|live|connected)\b/i, category: "online", boost: 200 },
  { patterns: /\b(idle|stopped|parked|waiting)\b/i, category: "idle", boost: 200 },
  { patterns: /\b(speed|fast|violation|over)\b/i, category: "speed", boost: 200 },
  { patterns: /\b(battery|charge|power)\b/i, category: "battery", boost: 200 },
  { patterns: /\b(driver|drivers|drove|driving)\b/i, category: "drivers", boost: 150 },
  { patterns: /\b(route|trip|path|journey)\b/i, category: "trips", boost: 150 },
  { patterns: /\b(report|summary|weekly|daily)\b/i, category: "reports", boost: 150 },
  { patterns: /\b(zone|geofence|area|fence)\b/i, category: "geofences", boost: 150 },
  { patterns: /\b(alert|warning|alarm)\b/i, category: "alerts", boost: 150 },
  { patterns: /\b(export|csv|download)\b/i, category: "exports", boost: 150 },
  { patterns: /\b(who|which|what|where|when|how many)\b/i, category: "ai", boost: 100 },
];

function getIntentBoost(query: string, command: Command): number {
  let boost = 0;
  for (const intent of INTENT_MAP) {
    if (intent.patterns.test(query)) {
      const haystack = [command.title, command.description, ...(command.keywords ?? [])].join(" ").toLowerCase();
      if (haystack.includes(intent.category)) boost += intent.boost;
    }
  }
  return boost;
}

export function searchCommands(query: string, commands: Command[]): CommandResult[] {
  if (!query.trim()) {
    return commands.map((cmd) => ({ ...cmd, score: 0, matchedIndices: [] }));
  }

  const results: CommandResult[] = [];

  for (const cmd of commands) {
    const titleMatch = fuzzyMatch(query, cmd.title);
    let bestMatch = titleMatch;
    let bestField: "title" | "description" | "keywords" = "title";

    if (cmd.description) {
      const descMatch = fuzzyMatch(query, cmd.description);
      if (descMatch.score > bestMatch.score) {
        bestMatch = descMatch;
        bestField = "description";
      }
    }

    if (cmd.keywords) {
      for (const kw of cmd.keywords) {
        const kwMatch = fuzzyMatch(query, kw);
        if (kwMatch.score > bestMatch.score) {
          bestMatch = kwMatch;
          bestField = "keywords";
        }
      }
    }

    if (bestMatch.score === 0) continue;

    const intentBoost = getIntentBoost(query, cmd);
    const categoryBoost = cmd.category.toLowerCase().includes(query.toLowerCase()) ? 100 : 0;
    const aiBoost = cmd.aiQuery && /\b(who|which|what|where|show|find|summarize|suggest)\b/i.test(query) ? 50 : 0;

    let indices = bestMatch.indices;
    if (bestField !== "title") indices = [];

    results.push({
      ...cmd,
      score: bestMatch.score + intentBoost + categoryBoost + aiBoost,
      matchedIndices: indices,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
