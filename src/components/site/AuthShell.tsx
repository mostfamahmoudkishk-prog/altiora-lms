import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/altiora-logo-transparent.png";
import { PoweredByMogenix } from "./PoweredByMogenix";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-secondary/40 to-background px-4 py-10">
      {/* Floating shapes */}
      <motion.div
        className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -start-24 size-80 rounded-full bg-primary/15 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, -20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-md rounded-3xl border border-border bg-card/90 p-8 shadow-elevated backdrop-blur-xl md:p-10"
      >
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            aria-label="الصفحة الرئيسية"
            className="inline-flex items-center rounded-xl bg-transparent transition-opacity hover:opacity-80"
          >
            <img
              src={logo}
              alt="Altiora"
              className="h-18 md:h-22 w-auto bg-transparent object-contain"
            />
          </Link>
        </div>
        {children}
        <div className="mt-8 flex justify-center border-t border-border/60 pt-4">
          <PoweredByMogenix />
        </div>
      </motion.div>
    </div>
  );
}
