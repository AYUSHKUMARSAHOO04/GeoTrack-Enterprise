"use client";

import { type Variants } from "framer-motion";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

export const staggerContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
};

export const cardHover = {
  initial: { y: 0 },
  whileHover: { y: -2, transition: { duration: 0.2, ease: easeOut } },
};
