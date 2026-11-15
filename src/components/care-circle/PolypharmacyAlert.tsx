"use client";

import React from "react";
import { ShieldAlert, Clock, Layers, Sparkles } from "lucide-react";
import { PolypharmacyConflict } from "@/lib/polypharmacyEngine";
import { FoodRule } from "@/lib/types";

interface PolypharmacyAlertProps {
  conflicts: PolypharmacyConflict[];
  overrideConfirmed: boolean;
  onToggleOverride: (checked: boolean) => void;
  onApplyRecommendedTiming: (times: string[], foodRule?: FoodRule) => void;
}

export function PolypharmacyAlert({
  conflicts,
  overrideConfirmed,
  onToggleOverride,
  onApplyRecommendedTiming,
}: PolypharmacyAlertProps) {
  if (conflicts.length === 0) return null;

  const needsOverride = conflicts.some((c) => c.requiresExplicitOverride);

  return (
    <div className="space-y-3 my-4" role="region" aria-label="Polypharmacy Interaction Guardrail Warnings">
      {conflicts.map((conflict) => {
        const isSevere = conflict.severity === "SEVERE";
        const isTiming = conflict.severity === "TIMING_CONFLICT";

        return (
          <div
            key={conflict.id}
            className={`rounded-2xl p-4 border-2 shadow-xs ${
              isSevere
                ? "bg-red-50 border-red-600 text-red-950"
                : isTiming
                  ? "bg-amber-50 border-amber-500 text-amber-950"
                  : "bg-orange-50 border-orange-500 text-orange-950"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  isSevere
                    ? "bg-red-600 text-white"
                    : isTiming
                      ? "bg-amber-600 text-white"
                      : "bg-orange-600 text-white"
                }`}
              >
                {isSevere ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : isTiming ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-black text-base">{conflict.title}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                      isSevere
                        ? "bg-red-200 text-red-900"
                        : isTiming
                          ? "bg-amber-200 text-amber-900"
                          : "bg-orange-200 text-orange-900"
                    }`}
                  >
                    {conflict.severity.replace("_", " ")} • vs{" "}
                    {conflict.conflictingMedicationName}
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-medium mb-2">
                  <strong>Pharmacological Mechanism:</strong>{" "}
                  {conflict.mechanism}
                </p>

                <p className="text-xs leading-relaxed font-bold bg-white/80 p-2.5 rounded-xl border border-current/20">
                  <strong>Clinical Guidance:</strong>{" "}
                  {conflict.clinicalRecommendation}
                </p>

                {conflict.recommendedTimes &&
                  conflict.recommendedTimes.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          onApplyRecommendedTiming(
                            conflict.recommendedTimes!,
                            conflict.recommendedFoodRule
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Auto-Fix Spacing: Shift Schedule to{" "}
                        {conflict.recommendedTimes.join(", ")} (Safe 4h Window)
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}

      {needsOverride && (
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-red-100/90 border-2 border-red-700 cursor-pointer text-xs font-bold text-red-950">
          <input
            type="checkbox"
            checked={overrideConfirmed}
            onChange={(e) => onToggleOverride(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-700 rounded"
          />
          <span>
            Explicit Clinical Override (RULE-CLIN-02): I acknowledge this high-severity interaction warning and confirm that Dr. Elena Vance has authorized staging this medication for review.
          </span>
        </label>
      )}
    </div>
  );
}
