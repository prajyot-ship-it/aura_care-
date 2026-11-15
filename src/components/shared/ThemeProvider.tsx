"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { installClientVaultFallback } from "@/lib/clientVaultFallback";

if (typeof window !== "undefined") {
  installClientVaultFallback();
}

export type ThemeMode = "day" | "night";

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "day",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("day");

  useEffect(() => {
    const saved = window.localStorage.getItem("aura_theme_mode") as ThemeMode | null;
    if (saved === "day" || saved === "night") {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "day");
    }
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    window.localStorage.setItem("aura_theme_mode", mode);
    document.documentElement.setAttribute("data-theme", mode);
  };

  const toggleTheme = () => {
    setTheme(theme === "day" ? "night" : "day");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggleButton({
  size = "compact",
}: {
  size?: "compact" | "elder";
}) {
  const { theme, toggleTheme } = useTheme();
  const isNight = theme === "night";

  if (size === "elder") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          isNight
            ? "Switch to Pure White Day Mode"
            : "Switch to Glossy Midnight Blue Night Mode"
        }
        className={`min-h-[64px] min-w-[200px] px-6 py-3.5 rounded-full font-display font-semibold text-[20px] flex items-center justify-center gap-2.5 border transition-all shadow-sm ${
          isNight
            ? "bg-gradient-to-r from-[#1E3A8A] to-[#0F172A] text-white border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
            : "bg-white hover:bg-slate-50 text-[#111827] border-[#E2DDD5]"
        }`}
      >
        {isNight ? (
          <>
            <Sun className="w-5 h-5 text-amber-300" />
            <span>☀️ Day White</span>
          </>
        ) : (
          <>
            <Moon className="w-5 h-5 text-[#2563EB]" />
            <span>🌙 Midnight Blue</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isNight
          ? "Switch to Pure White Day Mode"
          : "Switch to Glossy Midnight Blue Night Mode"
      }
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
        isNight
          ? "bg-gradient-to-r from-[#1E3A8A] to-[#0F172A] text-white border-sky-400/40 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
          : "bg-white hover:bg-slate-50 text-[#111827] border-[#E2DDD5] shadow-2xs"
      }`}
    >
      {isNight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span>Day Mode (White)</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Night (Midnight Blue)</span>
        </>
      )}
    </button>
  );
}
