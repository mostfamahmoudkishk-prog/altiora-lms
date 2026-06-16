import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:px-6 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl"
        >
          <h1 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
            {title}
          </h1>
          <div className="space-y-4 text-[15px] leading-loose text-foreground/85">{children}</div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
