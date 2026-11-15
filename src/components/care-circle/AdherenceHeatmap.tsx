"use client";

import React from "react";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";

interface HeatmapDay {
  dateStr: string;
  label: string;
  taken: number;
  total: number;
  adherenceRate: number;
}

interface AdherenceHeatmapProps {
  trailing30DayPercent: number;
  takenCount: number;
  missedOrSkippedCount: number;
  totalEvaluated: number;
  dailyHeatmap: HeatmapDay[];
}

export function AdherenceHeatmap({
  trailing30DayPercent,
  takenCount,
  missedOrSkippedCount,
  totalEvaluated,
  dailyHeatmap,
}: AdherenceHeatmapProps) {
  return (
    <div className="bento-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-[18px] font-semibold text-[#111827]">
              14-Day Longitudinal Adherence &amp; Circadian Pattern Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated across {totalEvaluated} scheduled dose windows • Evening statin (Atorvastatin 21:00) miss cluster flagged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-[#0F766E] font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-mono">{takenCount}</span> Taken
          </div>
          <div className="flex items-center gap-1.5 text-[#D97706] font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span className="font-mono">{missedOrSkippedCount}</span> Missed / Skipped
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] font-mono font-bold text-[#111827]">
            {trailing30DayPercent}% 30d Avg
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
        {dailyHeatmap.map((day) => {
          const isPerfect = day.adherenceRate === 100;
          const isPartial = day.adherenceRate >= 70 && day.adherenceRate < 100;
          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl p-2.5 border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-0.5 ${
                isPerfect
                  ? "bg-emerald-50/70 border-[#10B981]/40 text-[#0F766E]"
                  : isPartial
                    ? "bg-amber-50/80 border-[#D97706]/40 text-[#B45309]"
                    : "bg-red-50 border-red-300 text-red-900"
              }`}
              title={`${day.label}: ${day.taken}/${day.total} doses taken (${day.adherenceRate}%)`}
            >
              <span className="text-[10px] font-medium text-slate-500">
                {day.label}
              </span>
              <span className="font-mono text-xs font-bold my-1 tabular-nums">
                {day.adherenceRate}%
              </span>
              <span className="font-mono text-[10px] opacity-75">
                {day.taken}/{day.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
