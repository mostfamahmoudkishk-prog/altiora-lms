import { Sun, Moon, Laptop, Palette } from "lucide-react";
import { useTheme, ThemeMode, ThemePreset } from "./theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative flex size-10 items-center justify-center rounded-xl text-zinc-400 hover:text-primary transition-colors hover:bg-muted border border-border focus:outline-none cursor-pointer ${className}`}
          aria-label="تغيير المظهر"
        >
          <motion.div
            key={resolvedTheme}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {resolvedTheme === "dark" ? (
              <Moon className="size-5 text-indigo-400" />
            ) : (
              <Sun className="size-5 text-amber-500" />
            )}
          </motion.div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-40 rounded-2xl border border-border bg-card p-2 shadow-elevated text-right font-display"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:bg-secondary focus:text-primary ${
            theme === "light" ? "bg-secondary text-primary" : ""
          }`}
        >
          <span>مضيء</span>
          <Sun className="size-4 text-amber-500" />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:bg-secondary focus:text-primary ${
            theme === "dark" ? "bg-secondary text-primary" : ""
          }`}
        >
          <span>داكن</span>
          <Moon className="size-4 text-indigo-400" />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:bg-secondary focus:text-primary ${
            theme === "system" ? "bg-secondary text-primary" : ""
          }`}
        >
          <span>النظام</span>
          <Laptop className="size-4 text-zinc-500" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ThemeManagerProps {
  onPresetSelect?: () => void;
}

export function ThemeManager({ onPresetSelect }: ThemeManagerProps) {
  const { theme, resolvedTheme, themePreset, autoSchedule, setTheme, setThemePreset, setAutoSchedule } = useTheme();

  const presets: { id: ThemePreset; name: string; colorClass: string; iconColor: string }[] = [
    { id: "luxury", name: "Luxury Gold", colorClass: "bg-amber-500", iconColor: "text-amber-500" },
    { id: "default", name: "Pure Light", colorClass: "bg-indigo-500", iconColor: "text-indigo-500" },
    { id: "midnight", name: "Midnight Blue", colorClass: "bg-blue-600", iconColor: "text-blue-600" },
    { id: "emerald", name: "Emerald Green", colorClass: "bg-emerald-500", iconColor: "text-emerald-500" },
    { id: "purple", name: "Royal Purple", colorClass: "bg-purple-500", iconColor: "text-purple-500" },
  ];

  return (
    <div className="space-y-4 p-2 text-right font-display" dir="rtl">
      {/* Theme Modes */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-black text-muted-foreground tracking-wider uppercase mb-1">وضع المظهر</h4>
        <div className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => {
            const isActive = theme === mode;
            let label = "تلقائي";
            let Icon = Laptop;
            if (mode === "light") {
              label = "مضيء";
              Icon = Sun;
            } else if (mode === "dark") {
              label = "داكن";
              Icon = Moon;
            }

            return (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] font-bold transition-all gap-1 cursor-pointer focus:outline-none ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className={`size-4.5 ${mode === "light" ? "text-amber-500" : mode === "dark" ? "text-indigo-400" : "text-zinc-500"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto Theme Schedule Switch */}
      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoSchedule}
            onChange={(e) => setAutoSchedule(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
        <div className="text-right">
          <span className="text-xs font-bold text-foreground block">توقيت تلقائي (Auto Theme)</span>
          <span className="text-[9px] text-muted-foreground">مضيء بالنهار (7ص - 6م)، داكن بالليل</span>
        </div>
      </div>

      {/* Theme Presets */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between mb-1">
          <Palette className="size-4 text-muted-foreground" />
          <h4 className="text-[11px] font-black text-muted-foreground tracking-wider uppercase">تنسيق الألوان (Presets)</h4>
        </div>
        <div className="space-y-1">
          {presets.map((preset) => {
            const isActive = themePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setThemePreset(preset.id);
                  if (onPresetSelect) onPresetSelect();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all border cursor-pointer focus:outline-none ${
                  isActive
                    ? "bg-secondary text-primary border-primary/20 shadow-sm"
                    : "text-foreground hover:bg-secondary/60 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-3 rounded-full ${preset.colorClass} border border-white/20`} />
                  <span className="font-mono text-[10px]">{preset.name}</span>
                </div>
                <span>{preset.id === "luxury" ? "Luxury Gold" : preset.id === "midnight" ? "Midnight Blue" : preset.id === "emerald" ? "Emerald Green" : preset.id === "purple" ? "Royal Purple" : "Pure Light"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
