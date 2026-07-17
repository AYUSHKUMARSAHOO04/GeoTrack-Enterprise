"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Clock, Star } from "lucide-react";
import type { RecentCommandEntry } from "./types";
import type { Command } from "./types";

interface EmptyStateProps {
  recentCommands: RecentCommandEntry[];
  commands: Command[];
  onSelectCommand: (cmd: Command) => void;
}

const POPULAR_IDS = ["nav-map", "nav-analytics", "ai-summarize", "act-create-device", "dev-battery"];

export function EmptyState({ recentCommands, commands, onSelectCommand }: EmptyStateProps) {
  const popular = commands.filter((c) => POPULAR_IDS.includes(c.id)).slice(0, 5);

  return (
    <div className="px-3 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center py-6 text-center"
      >
        <div className="relative mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl bg-primary/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Geo Command</h3>
        <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
          Type to search, navigate, or ask AI anything about your fleet
        </p>
      </motion.div>

      {recentCommands.length > 0 && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
            </span>
          </div>
          <div className="space-y-0.5">
            {recentCommands.map((entry) => {
              const cmd = commands.find((c) => c.id === entry.id);
              if (!cmd) return null;
              const Icon = cmd.icon;
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectCommand(cmd)}
                  className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 text-left text-[13px] font-medium text-foreground">
                    {entry.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(entry.timestamp)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 px-2.5">
          <Star className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Popular
          </span>
        </div>
        <div className="space-y-0.5">
          {popular.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => onSelectCommand(cmd)}
                className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    cmd.category === "AI"
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-left text-[13px] font-medium text-foreground">
                  {cmd.title}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
