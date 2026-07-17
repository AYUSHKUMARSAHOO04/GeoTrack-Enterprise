"use client";

import { motion } from "framer-motion";
import { Search, CornerDownLeft, Sparkles, ArrowLeft } from "lucide-react";
import type { PaletteMode } from "./types";

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
  mode: PaletteMode;
  onExitAI?: () => void;
}

export function CommandInput({ value, onChange, isSearching, mode, onExitAI }: CommandInputProps) {
  const isAI = mode === "ai";

  return (
    <div className="relative flex items-center gap-3 border-b border-border px-4 py-3.5">
      {isAI ? (
        <button
          onClick={onExitAI}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <motion.div
          animate={{ rotate: isSearching ? 360 : 0 }}
          transition={{ duration: 1, repeat: isSearching ? Infinity : 0, ease: "linear" }}
        >
          <Search className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={2.2} />
        </motion.div>
      )}

      {isAI && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        </motion.div>
      )}

      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isAI ? "Ask AI about your fleet..." : "Type a command or ask AI..."}
        className={`flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground ${
          isAI ? "text-violet-100" : "text-foreground"
        }`}
        spellCheck={false}
        autoComplete="off"
      />

      {value ? (
        <button
          onClick={() => onChange("")}
          className="flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          ESC
        </button>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground">
          <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium">
            ↵
          </kbd>
          <CornerDownLeft className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
