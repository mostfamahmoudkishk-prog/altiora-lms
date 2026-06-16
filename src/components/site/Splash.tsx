import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "@/assets/altiora-logo-transparent.png";

export function Splash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem("altiora_splash");
    if (seen) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => {
      sessionStorage.setItem("altiora_splash", "1");
      setShow(false);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-secondary/40"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          {/* particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute size-1.5 rounded-full bg-accent/60"
                style={{
                  left: `${(i * 53) % 100}%`,
                  top: `${(i * 37) % 100}%`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 0.8, 0], y: -40 }}
                transition={{
                  duration: 2.4,
                  delay: (i % 6) * 0.15,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Glow */}
          <motion.div
            className="absolute size-[28rem] rounded-full bg-accent/25 blur-3xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.7, 0.4], scale: [0.6, 1.1, 1] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />

          <motion.img
            src={logo}
            alt="Altiora"
            className="relative z-10 h-28 w-auto md:h-38 object-contain"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.p
            className="relative z-10 mt-6 font-display text-lg font-semibold text-primary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            «نحو القمة»
          </motion.p>

          <motion.div
            className="relative z-10 mt-8 h-1 w-40 overflow-hidden rounded-full bg-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full w-full origin-left bg-gradient-to-r from-primary to-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
