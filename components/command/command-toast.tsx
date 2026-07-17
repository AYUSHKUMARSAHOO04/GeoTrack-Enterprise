"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useCommandPalette } from "./palette-provider";
import { toastVariants } from "./animations";

export function CommandToast() {
  const { toast } = useCommandPalette();
  const Icon = toast?.icon ?? CheckCircle;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-border glass px-4 py-2.5 shadow-lg">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
              <Icon className="h-3 w-3 text-success" />
            </div>
            <span className="text-[13px] font-medium text-foreground">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
