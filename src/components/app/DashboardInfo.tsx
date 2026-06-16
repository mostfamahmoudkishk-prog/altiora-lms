import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function DashboardInfo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
    >
      <h1 className="mb-5 font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      <div className="space-y-4 text-[15px] leading-loose text-foreground/85">{children}</div>
    </motion.div>
  );
}
