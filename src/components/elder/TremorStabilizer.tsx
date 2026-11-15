"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Hand, CheckCircle2, Sparkles } from "lucide-react";

const STORAGE_KEY = "aura_steady_hand_mode";

export function useTremorStabilizer() {
  const [steadyHandActive, setSteadyHandActive] = useState(false);
  const [autoDetectedBanner, setAutoDetectedBanner] = useState(false);

  const applyMode = useCallback((active: boolean, wasAuto = false) => {
    setSteadyHandActive(active);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, active ? "on" : "off");
      document.documentElement.setAttribute(
        "data-tremor-stabilizer",
        active ? "on" : "off"
      );
    }
    if (wasAuto && active) {
      setAutoDetectedBanner(true);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "on") {
      applyMode(true, false);
    }

    // Track pointer micro-oscillations (Shake-to-Calm / Tremor Detector)
    let lastX = 0;
    let lastY = 0;
    let lastDirX = 0;
    let lastDirY = 0;
    const reversalTimestamps: number[] = [];

    function handlePointerMove(e: PointerEvent) {
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // Look for rapid small-to-medium direction reversals (2px to 45px)
      const dirX = Math.abs(dx) > 2 && Math.abs(dx) < 45 ? Math.sign(dx) : 0;
      const dirY = Math.abs(dy) > 2 && Math.abs(dy) < 45 ? Math.sign(dy) : 0;

      if (
        (dirX !== 0 && lastDirX !== 0 && dirX !== lastDirX) ||
        (dirY !== 0 && lastDirY !== 0 && dirY !== lastDirY)
      ) {
        reversalTimestamps.push(now);
      }

      if (dirX !== 0) lastDirX = dirX;
      if (dirY !== 0) lastDirY = dirY;

      // Prune reversals older than 650ms
      while (
        reversalTimestamps.length > 0 &&
        now - reversalTimestamps[0] > 650
      ) {
        reversalTimestamps.shift();
      }

      // If >= 7 rapid direction reversals occur within 650ms, auto-enable Steady-Hand Mode
      if (
        reversalTimestamps.length >= 7 &&
        document.documentElement.getAttribute("data-tremor-stabilizer") !== "on"
      ) {
        reversalTimestamps.length = 0;
        applyMode(true, true);
      }
    }

    // Accidental double-tap debounce filter when Steady-Hand Mode is active
    let lastClickTime = 0;
    let lastClickedEl: EventTarget | null = null;

    function handleClickCapture(e: MouseEvent) {
      if (
        document.documentElement.getAttribute("data-tremor-stabilizer") !== "on"
      ) {
        return;
      }
      const now = performance.now();
      if (e.target === lastClickedEl && now - lastClickTime < 340) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      lastClickTime = now;
      lastClickedEl = e.target;
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("click", handleClickCapture, true);
    };
  }, [applyMode]);

  return {
    steadyHandActive,
    autoDetectedBanner,
    setAutoDetectedBanner,
    toggleSteadyHand: () => applyMode(!steadyHandActive, false),
  };
}

export function SteadyHandToggleButton({
  size = "elder",
}: {
  size?: "elder" | "compact";
}) {
  const {
    steadyHandActive,
    autoDetectedBanner,
    setAutoDetectedBanner,
    toggleSteadyHand,
  } = useTremorStabilizer();

  return (
    <>
      <button
        type="button"
        onClick={toggleSteadyHand}
        aria-pressed={steadyHandActive}
        title="Shake-to-Calm Tremor-Adaptive Touch Stabilizer: Expands touch targets and filters accidental double-taps"
        className={
          size === "elder"
            ? `min-h-[64px] min-w-[220px] px-6 py-3.5 rounded-full font-display font-semibold text-[20px] flex items-center justify-center gap-2.5 border transition-all ${
                steadyHandActive
                  ? "bg-[#0F766E] text-white border-[#10B981] shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                  : "bg-white hover:bg-slate-50 text-[#111827] border-[#E2DDD5]"
              }`
            : `px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                steadyHandActive
                  ? "bg-[#0F766E] text-white border-[#10B981]"
                  : "bg-white hover:bg-slate-50 text-[#111827] border-[#E2DDD5]"
              }`
        }
      >
        <Hand className={size === "elder" ? "w-5 h-5" : "w-3.5 h-3.5"} />
        <span>
          {steadyHandActive ? "✓ Steady-Hand: ON" : "Steady-Hand Stabilizer"}
        </span>
      </button>

      {steadyHandActive &&
        autoDetectedBanner &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="status"
            className="fixed bottom-6 left-6 z-[100] max-w-md p-5 rounded-3xl bg-[#0F766E] text-white border-2 border-[#10B981] shadow-2xl flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-emerald-200 shrink-0 mt-0.5" />
              <div>
                <div className="font-display font-bold text-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Shake-to-Calm Stabilizer Activated</span>
                </div>
                <p className="text-sm text-emerald-50 mt-1 leading-snug">
                  Pointer tremor detected. Touch targets are now expanded (+18%) and accidental double-taps (340ms debounce) are filtered.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoDetectedBanner(false)}
              className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold shrink-0"
            >
              Got it
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
