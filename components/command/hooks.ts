"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Command, CommandResult } from "./types";
import { searchCommands } from "./search-engine";

export function useDebouncedSearch(commands: Command[], debounceMs = 80) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults(commands.map((c) => ({ ...c, score: 0, matchedIndices: [] })));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      const searchResults = searchCommands(query, commands);
      setResults(searchResults);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, commands, debounceMs]);

  const reset = useCallback(() => {
    setQuery("");
    setResults(commands.map((c) => ({ ...c, score: 0, matchedIndices: [] })));
  }, [commands]);

  return { query, setQuery, results, isSearching, reset };
}

export function useKeyboardNav(
  results: CommandResult[],
  onSelect: (cmd: CommandResult) => void,
  enabled: boolean
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = results[activeIndex];
        if (cmd) onSelect(cmd);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else {
          setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, results, activeIndex, onSelect]);

  return { activeIndex, setActiveIndex, itemRefs };
}
