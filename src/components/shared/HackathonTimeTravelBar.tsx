"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Clock,
  Mail,
  Sparkles,
  BellRing,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";
import { SimulationMode } from "@/lib/escalationEngine";

interface HackathonTimeTravelBarProps {
  emailOutboxCount: number;
  onOpenOutbox: () => void;
  onAfterTick: (message: string) => void;
}

export function HackathonTimeTravelBar({
  emailOutboxCount,
  onOpenOutbox,
  onAfterTick,
}: HackathonTimeTravelBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const [busyMode, setBusyMode] = useState<SimulationMode | null>(null);
  const [lastResultMessage, setLastResultMessage] = useState<string | null>(
    null
  );

  async function triggerTimeTravel(mode: SimulationMode) {
    setBusyMode(mode);
    setLastResultMessage(null);
    try {
      const res = await fetch("/api/escalations/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string; dispatchedCount: number };
        error?: string;
      };
      if (json.success && json.data) {
        setLastResultMessage(json.data.message);
        onAfterTick(json.data.message);
      } else {
        setLastResultMessage(json.error || "Escalation trigger failed.");
      }
    } catch {
      setLastResultMessage("Network error triggering time-travel simulation.");
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <div
      aria-label="Hackathon Judge Time-Travel Simulator"
      className="fixed bottom-5 right-5 z-40 max-w-full pl-4"
    >
      <div className="bg-[#111827]/95 backdrop-blur-md text-white rounded-3xl sm:rounded-full p-2.5 shadow-dock border border-slate-800 flex flex-col gap-2">
        <AnimatePresence mode="wait">
          {lastResultMessage && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="px-4 py-1.5 rounded-full bg-emerald-950/90 border border-[#10B981]/40 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-300 font-medium"
            >
              <span>✓ {lastResultMessage}</span>
              <button
                type="button"
                onClick={onOpenOutbox}
                className="underline font-semibold text-amber-300 hover:text-amber-200"
              >
                Inspect HTML Email →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Time-Travel Escalation:</span>
          </div>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            disabled={busyMode !== null}
            onClick={() => triggerTimeTravel("SIMULATE_TIER_1")}
            className="px-3 py-1.5 rounded-full bg-[#0F766E] hover:bg-teal-700 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{busyMode === "SIMULATE_TIER_1" ? "Sending..." : "T-15m Upcoming Cue"}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            disabled={busyMode !== null}
            onClick={() => triggerTimeTravel("SIMULATE_TIER_2")}
            className="px-3 py-1.5 rounded-full bg-[#D97706] hover:bg-amber-600 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{busyMode === "SIMULATE_TIER_2" ? "Sending..." : "+30m Missed Nudge"}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            disabled={busyMode !== null}
            onClick={() => triggerTimeTravel("SIMULATE_TIER_3")}
            className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {busyMode === "SIMULATE_TIER_3"
                ? "Escalating..."
                : "+90m Care-Circle Escalation"}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            disabled={busyMode !== null}
            onClick={() => triggerTimeTravel("SIMULATE_APPT_PREP")}
            className="px-3 py-1.5 rounded-full bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>
              {busyMode === "SIMULATE_APPT_PREP"
                ? "Preparing..."
                : "24h Appointment Prep"}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            onClick={onOpenOutbox}
            className="px-3.5 py-1.5 rounded-full bg-white text-[#111827] hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Live Email Outbox</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#2563EB] text-white font-mono text-[11px]">
              {emailOutboxCount}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
