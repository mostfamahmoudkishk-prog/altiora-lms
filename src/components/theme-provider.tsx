import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePreset = "luxury" | "default" | "midnight" | "emerald" | "purple";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  themePreset: ThemePreset;
  autoSchedule: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setThemePreset: (preset: ThemePreset) => Promise<void>;
  setAutoSchedule: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as ThemeMode) || "system";
    }
    return "system";
  });

  const [themePreset, setThemePresetState] = useState<ThemePreset>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme-preset") as ThemePreset) || "luxury";
    }
    return "luxury";
  });

  const [autoSchedule, setAutoScheduleState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme-auto-schedule") === "true";
    }
    return false;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  // Calculate resolved theme and presets, apply class and dataset attributes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    const applyTheme = () => {
      let isDark = false;
      if (autoSchedule) {
        const hour = new Date().getHours();
        isDark = !(hour >= 7 && hour < 18);
      } else if (theme === "dark") {
        isDark = true;
      } else if (theme === "light") {
        isDark = false;
      } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      const nextTheme = isDark ? "dark" : "light";
      setResolvedTheme(nextTheme);

      if (nextTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      root.setAttribute("data-preset", themePreset);
    };

    applyTheme();

    // Time checker interval (every 30 seconds to catch hourly shifts)
    const interval = setInterval(applyTheme, 30000);

    // Media query listener for OS changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      if (!autoSchedule && theme === "system") {
        applyTheme();
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [theme, themePreset, autoSchedule]);

  const syncWithDb = async (newTheme?: ThemeMode, newPreset?: ThemePreset) => {
    const user = getCurrentUser();
    if (user && user.email) {
      try {
        const { updateThemeServerFn } = await import("@/lib/api/auth.functions");
        await updateThemeServerFn({
          data: {
            email: user.email,
            theme: newTheme,
            themePreset: newPreset,
          },
        });
      } catch (err) {
        console.warn("Failed to sync theme settings with DB:", err);
      }
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    await syncWithDb(newTheme, undefined);
  };

  const setThemePreset = async (newPreset: ThemePreset) => {
    setThemePresetState(newPreset);
    localStorage.setItem("theme-preset", newPreset);
    await syncWithDb(undefined, newPreset);
  };

  const setAutoSchedule = async (enabled: boolean) => {
    setAutoScheduleState(enabled);
    localStorage.setItem("theme-auto-schedule", enabled ? "true" : "false");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        themePreset,
        autoSchedule,
        setTheme,
        setThemePreset,
        setAutoSchedule,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
