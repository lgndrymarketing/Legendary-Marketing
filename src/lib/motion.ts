import type { Variants, Transition } from "motion/react";

/**
 * Shared motion vocabulary (see design.md §4). Never linear: everything uses
 * an ease-out-quint curve or a snappy spring. Global CSS already zeroes
 * durations under prefers-reduced-motion.
 */

export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Page-level enter: a sheet settling into place. Use on template roots. */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.995 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

/** Parent for cascading sections — pair children with `cascadeItem`. */
export const cascade: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export const cascadeItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
};

/** Table/list rows — tighter stagger, cap usage at ~12 rows. */
export const rowCascade: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025 } },
};

export const rowItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easeOutExpo },
  },
};
