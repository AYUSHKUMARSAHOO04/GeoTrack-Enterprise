"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CornerDownLeft } from "lucide-react";
import { useCommandPalette } from "./palette-provider";
import { useDebouncedSearch, useKeyboardNav } from "./hooks";
import { CommandInput } from "./command-input";
import { CommandGroup } from "./command-group";
import { EmptyState } from "./empty-state";
import { AIResponsePanel } from "./ai-response-panel";
import { CATEGORY_ORDER } from "./registry";
import { isAIQuery } from "./ai-engine";
import { overlayVariants, paletteVariants, aiModeVariants } from "./animations";
import type { CommandResult } from "./types";

export function CommandPalette() {
  const {
    isOpen,
    close,
    commands,
    recentCommands,
    addRecent,
    mode,
    aiQuery,
    enterAIMode,
    exitAIMode,
  } = useCommandPalette();
  const { query, setQuery, results, isSearching, reset } = useDebouncedSearch(commands, 80);
  const [localAIQuery, setLocalAIQuery] = useState<string | null>(null);

  const activeAIQuery = aiQuery ?? localAIQuery;

  useEffect(() => {
    if (!isOpen) {
      reset();
      setLocalAIQuery(null);
    }
  }, [isOpen, reset]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandResult[]>();
    for (const result of results) {
      const existing = groups.get(result.category) ?? [];
      existing.push(result);
      groups.set(result.category, existing);
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  const showAskAI = useMemo(() => {
    return query.trim().length >= 4 && isAIQuery(query) && mode === "command";
  }, [query, mode]);

  const handleSelect = useCallback(
    (cmd: CommandResult) => {
      addRecent(cmd);
      cmd.action();
      close();
      reset();
    },
    [addRecent, close, reset]
  );

  const handleAskAI = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setLocalAIQuery(q);
    enterAIMode(q);
  }, [query, enterAIMode]);

  const handleReset = useCallback(() => {
    setLocalAIQuery(null);
    exitAIMode();
    reset();
  }, [exitAIMode, reset]);

  const { activeIndex, setActiveIndex, itemRefs } = useKeyboardNav(
    flatResults,
    handleSelect,
    isOpen && mode === "command"
  );

  const groupOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let acc = 0;
    for (const cat of CATEGORY_ORDER) {
      const group = grouped.get(cat);
      if (group && group.length > 0) {
        offsets[cat] = acc;
        acc += group.length;
      }
    }
    return offsets;
  }, [grouped]);

  const refCallback = useCallback((index: number, el: HTMLDivElement | null) => {
    itemRefs.current[index] = el;
  }, [itemRefs]);

  useEffect(() => {
    if (mode !== "command" || !isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && showAskAI && activeIndex === -1) {
        e.preventDefault();
        handleAskAI();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, isOpen, showAskAI, activeIndex, handleAskAI]);

  const showEmpty = !query.trim() && flatResults.length === commands.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh] sm:pt-[18vh]"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => {
              close();
              reset();
            }}
          />

          <motion.div
            variants={paletteVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative w-full overflow-hidden rounded-2xl border shadow-2xl glass ${
              mode === "ai" ? "max-w-[720px] border-violet-500/20" : "max-w-[640px] border-border"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <CommandInput
              value={query}
              onChange={setQuery}
              isSearching={isSearching}
              mode={mode}
              onExitAI={handleReset}
            />

            <AnimatePresence mode="wait">
              {mode === "ai" && activeAIQuery ? (
                <motion.div
                  key="ai-panel"
                  variants={aiModeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <AIResponsePanel query={activeAIQuery} onReset={handleReset} />
                </motion.div>
              ) : (
                <motion.div
                  key="command-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="max-h-[52vh] overflow-y-auto scrollbar-thin p-2">
                    {showEmpty ? (
                      <EmptyState
                        recentCommands={recentCommands}
                        commands={commands}
                        onSelectCommand={(cmd) =>
                          handleSelect({ ...cmd, score: 0, matchedIndices: [] })
                        }
                      />
                    ) : flatResults.length === 0 && !showAskAI ? (
                      <NoResults query={query} onAskAI={handleAskAI} />
                    ) : (
                      <>
                        {showAskAI && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mb-1"
                          >
                            <button
                              onClick={handleAskAI}
                              className="group relative flex w-full items-center gap-3 rounded-lg bg-violet-500/10 px-2.5 py-2 transition-colors hover:bg-violet-500/15"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                              </div>
                              <div className="flex min-w-0 flex-1 items-center justify-between">
                                <div>
                                  <p className="text-[13px] font-medium text-violet-100">
                                    Ask AI: &ldquo;{query}&rdquo;
                                  </p>
                                  <p className="text-[11px] text-violet-400/70">
                                    Get an AI-powered analysis of your fleet
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-violet-400/60">
                                  <kbd className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium">
                                    ↵
                                  </kbd>
                                  <CornerDownLeft className="h-3 w-3" />
                                </div>
                              </div>
                            </button>
                          </motion.div>
                        )}

                        {CATEGORY_ORDER.map((category) => {
                          const group = grouped.get(category);
                          if (!group || group.length === 0) return null;
                          return (
                            <CommandGroup
                              key={category}
                              category={category}
                              results={group}
                              activeIndex={activeIndex}
                              offset={groupOffsets[category] ?? 0}
                              onSelect={handleSelect}
                              onHover={setActiveIndex}
                              refCallback={refCallback}
                            />
                          );
                        })}
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">↑↓</kbd>
                        navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">↵</kbd>
                        select
                      </span>
                      <span className="hidden items-center gap-1 sm:flex">
                        <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">Tab</kbd>
                        cycle
                      </span>
                    </div>
                    <span className="font-medium text-muted-foreground/70">
                      {mode === "ai" ? "AI Copilot" : "Geo Command"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NoResults({ query, onAskAI }: { query: string; onAskAI: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
        <Sparkles className="h-5 w-5 text-violet-400" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No command matches &ldquo;{query}&rdquo;</p>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">Try asking AI instead</p>
      <button
        onClick={onAskAI}
        className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[12px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI: &ldquo;{query}&rdquo;
      </button>
    </div>
  );
}
