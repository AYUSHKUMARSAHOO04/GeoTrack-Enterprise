import type { Variants } from "framer-motion";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const paletteVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.15, ease: easeInOut },
  },
};

export const resultVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const groupVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.02 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.2 } },
};

export const fabVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

export function highlightText(
  text: string,
  indices: number[]
): (string | { char: string; match: boolean })[] {
  if (!indices.length) return [text];
  const matchSet = new Set(indices);
  return text.split("").map((char, i) => ({ char, match: matchSet.has(i) }));
}

export const aiModeVariants: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

export const aiPanelVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};
