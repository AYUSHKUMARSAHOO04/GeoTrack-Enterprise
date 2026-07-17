"use client";

import { motion } from "framer-motion";
import type { CommandResult } from "./types";
import { CommandResultRow } from "./command-result";
import { CATEGORY_ICONS } from "./registry";
import { groupVariants } from "./animations";

interface CommandGroupProps {
  category: string;
  results: CommandResult[];
  activeIndex: number;
  offset: number;
  onSelect: (cmd: CommandResult) => void;
  onHover: (index: number) => void;
  refCallback: (index: number, el: HTMLDivElement | null) => void;
}

export function CommandGroup({
  category,
  results,
  activeIndex,
  offset,
  onSelect,
  onHover,
  refCallback,
}: CommandGroupProps) {
  if (results.length === 0) return null;
  const GroupIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];

  return (
    <motion.div variants={groupVariants} initial="initial" animate="animate" className="mb-1">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        {GroupIcon && <GroupIcon className="h-3 w-3 text-muted-foreground" />}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {category}
        </span>
        <span className="text-[10px] text-muted-foreground/60">{results.length}</span>
      </div>
      <div className="space-y-0.5">
        {results.map((cmd, i) => {
          const globalIndex = offset + i;
          return (
            <CommandResultRow
              key={cmd.id}
              command={cmd}
              index={globalIndex}
              isActive={activeIndex === globalIndex}
              onSelect={() => onSelect(cmd)}
              onHover={() => onHover(globalIndex)}
              refCallback={(el) => refCallback(globalIndex, el)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
