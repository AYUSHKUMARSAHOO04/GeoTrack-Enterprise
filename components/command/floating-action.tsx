"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Command } from "lucide-react";
import { useCommandPalette } from "./palette-provider";
import { fabVariants } from "./animations";

export function FloatingAction() {
  const { isOpen, open } = useCommandPalette();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          variants={fabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          whileHover="whileHover"
          whileTap="whileTap"
          onClick={open}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 sm:hidden"
          aria-label="Open command palette"
        >
          <Command className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
