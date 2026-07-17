"use client";

import { motion } from "motion/react";
import { pageEnter } from "@/lib/motion";

/** Route-change transition for the admin surface (design.md §4.1). */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageEnter}>
      {children}
    </motion.div>
  );
}
