import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { WifiOff, RotateCw } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          className="fixed inset-x-0 bottom-6 z-[90] mx-auto flex w-fit max-w-[92vw] items-center gap-4 rounded-2xl border border-border bg-card/95 px-5 py-4 shadow-elevated backdrop-blur-lg"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <motion.div
            className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <WifiOff className="size-5" />
          </motion.div>
          <div className="text-end">
            <div className="text-sm font-bold text-foreground">يبدو أن الاتصال بالإنترنت انقطع</div>
            <div className="text-xs text-muted-foreground">تحقق من اتصالك وحاول مرة أخرى</div>
          </div>
          <button
            onClick={() => location.reload()}
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105"
            aria-label="إعادة المحاولة"
          >
            <RotateCw className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
