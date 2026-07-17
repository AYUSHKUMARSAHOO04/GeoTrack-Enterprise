"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Command, RecentCommandEntry, PaletteMode } from "./types";
import { buildCommands, type CommandContext } from "./registry";

interface PaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: Command[];
  recentCommands: RecentCommandEntry[];
  addRecent: (cmd: Command) => void;
  clearRecent: () => void;
  navigate: (path: string) => void;
  toast: { message: string; icon?: React.ComponentType<{ className?: string }>; id: number } | null;
  showToast: (message: string, icon?: React.ComponentType<{ className?: string }>) => void;
  mode: PaletteMode;
  aiQuery: string | null;
  enterAIMode: (query: string) => void;
  exitAIMode: () => void;
}

const PaletteContext = createContext<PaletteState | null>(null);

const STORAGE_KEY = "geotrack-recent-commands";
const MAX_RECENT = 8;

function loadRecent(): RecentCommandEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentCommandEntry[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(entries: RecentCommandEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [recentCommands, setRecentCommands] = useState<RecentCommandEntry[]>([]);
  const [toast, setToast] = useState<PaletteState["toast"]>(null);
  const [mode, setMode] = useState<PaletteMode>("command");
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecentCommands(loadRecent());
  }, []);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const showToast = useCallback<PaletteState["showToast"]>((message, icon) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, icon, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const ctx: CommandContext = { navigate, showToast };
  const commands = useRef(buildCommands(ctx)).current;

  const addRecent = useCallback((cmd: Command) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((r) => r.id !== cmd.id);
      const entry: RecentCommandEntry = {
        id: cmd.id,
        title: cmd.title,
        category: cmd.category,
        timestamp: Date.now(),
      };
      const next = [entry, ...filtered].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentCommands([]);
    saveRecent([]);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setMode("command");
    setAiQuery(null);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setMode("command");
    setAiQuery(null);
  }, []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const enterAIMode = useCallback((query: string) => {
    setMode("ai");
    setAiQuery(query);
  }, []);

  const exitAIMode = useCallback(() => {
    setMode("command");
    setAiQuery(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === "/" && !isOpen && !isInputFocused(e)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <PaletteContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        commands,
        recentCommands,
        addRecent,
        clearRecent,
        navigate,
        toast,
        showToast,
        mode,
        aiQuery,
        enterAIMode,
        exitAIMode,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

function isInputFocused(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function useCommandPalette(): PaletteState {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}
