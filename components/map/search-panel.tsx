"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/hooks/use-live-map";

interface MapSearchPanelProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function MapSearchPanel({ vehicles, onSelectVehicle }: MapSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.driver.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute left-4 top-4 z-30 w-72 max-w-[calc(100vw-2rem)]">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 backdrop-blur-xl",
          "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-all",
          focused && "border-primary/30 ring-1 ring-primary/20"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search vehicles or drivers..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
        {query ? (
          <button onClick={() => setQuery("")} className="text-white/40 hover:text-white/70">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
            ⌘F
          </kbd>
        )}
      </motion.div>

      <AnimatePresence>
        {focused && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mt-2 max-h-72 overflow-y-auto scrollbar-thin overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl"
          >
            {filtered.slice(0, 6).map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => {
                  onSelectVehicle(vehicle);
                  setFocused(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm text-white/90">{vehicle.name}</div>
                  <div className="truncate text-xs text-white/40">{vehicle.driver}</div>
                </div>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    vehicle.status === "moving" && "bg-success",
                    vehicle.status === "idle" && "bg-warning",
                    vehicle.status === "offline" && "bg-white/20"
                  )}
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
