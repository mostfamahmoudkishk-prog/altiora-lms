import * as React from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MogenixFooter() {
  return (
    <div className="flex flex-col items-center justify-center py-2 select-none" dir="rtl">
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-1 cursor-pointer">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold font-display">
                Powered by
              </span>
              <motion.div
                whileHover={{ scale: 1.05, opacity: 1 }}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                <img
                  src="/mogenix-logo.png"
                  alt="MOGENIX"
                  className="h-3.5 w-auto object-contain brightness-95 contrast-125"
                />
              </motion.div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-primary text-primary-foreground border-border text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-elevated"
          >
            Powered by MOGENIX
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
