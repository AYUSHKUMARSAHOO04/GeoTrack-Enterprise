"use client";

import { motion } from "framer-motion";
import type { CommandResult } from "./types";
import { highlightText } from "./animations";
import { cn } from "@/lib/utils";

interface CommandResultRowProps {
  command: CommandResult;
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onHover: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
}

export function CommandResultRow({
  command: cmd,
  isActive,
  onSelect,
  onHover,
  refCallback,
}: CommandResultRowProps) {
  const Icon = cmd.icon;
  const highlighted = highlightText(cmd.title, cmd.matchedIndices);

  return (
    <motion.div
      ref={refCallback}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
        isActive ? "bg-accent" : "hover:bg-muted"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
          cmd.category === "AI"
            ? "bg-violet-500/15 text-violet-400"
            : cmd.status === "danger"
              ? "bg-destructive/15 text-destructive"
              : cmd.status === "success"
                ? "bg-success/15 text-success"
                : isActive
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">
            {highlighted.map((part, i) =>
              typeof part === "string" ? (
                <span key={i}>{part}</span>
              ) : (
                <span
                  key={i}
                  className={part.match ? "font-semibold text-primary" : ""}
                >
                  {part.char}
                </span>
              )
            )}
          </div>
          {cmd.description && (
            <div className="truncate text-[11px] text-muted-foreground">
              {cmd.description}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {cmd.shortcut && cmd.shortcut.length > 0 && (
            <div className="flex items-center gap-0.5">
              {cmd.shortcut.map((key, i) => (
                <kbd
                  key={i}
                  className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {key}
                </kbd>
              ))}
            </div>
          )}
          {cmd.aiQuery && (
            <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-400">
              AI
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
