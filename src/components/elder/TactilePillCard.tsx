"use client";

import React, { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Clock, AlertCircle, Lock, Utensils } from "lucide-react";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";

const InteractivePill3D = dynamic(
  () => import("@/components/three/InteractivePill3D"),
  { ssr: false }
);

export interface ElderDoseItem {
  id: string;
  medicationId: string;
  scheduledFor: string;
  status: string;
  loggedAt: string | null;
  loggedByName: string | null;
  lockVersion: number;
  note: string | null;
  medication: {
    id: string;
    name: string;
    genericName: string;
    drugClass: string;
    dosage: string;
    foodRule: string;
    instructions: string;
    pillShape: string;
    pillColorPrimary: string;
    pillColorSecondary: string;
    pillImprint: string;
    stockCount: number;
  };
}

interface TactilePillCardProps {
  dose: ElderDoseItem;
  onDoseUpdated: (message: string) => void;
}

const SKIP_REASONS = [
  "Upset Stomach",
  "Feeling Dizzy",
  "Forgot Earlier",
  "Ran Out of Pills",
];

function formatPlainFoodRule(foodRule: string): string {
  switch (foodRule) {
    case "EMPTY_STOMACH":
      return "Empty Stomach • 30–60m before meal";
    case "WITH_FOOD":
      return "Take With Food or Meal";
    case "BEFORE_SLEEP":
      return "Take Before Sleep";
    default:
      return "With Water (Anytime)";
  }
}

export function TactilePillCard({
  dose,
  onDoseUpdated,
}: TactilePillCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);
  const [showSkipReasons, setShowSkipReasons] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "conflict";
    text: string;
  } | null>(null);

  const isTaken = dose.status === "TAKEN";
  const isSkipped = dose.status === "SKIPPED";
  const scheduledTimeStr = new Date(dose.scheduledFor).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const loggedTimeStr = dose.loggedAt
    ? new Date(dose.loggedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  async function submitDoseAction(
    action: "TAKEN" | "SNOOZED" | "SKIPPED",
    note?: string,
    forceStaleLockVersion?: number
  ) {
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch("/api/doses/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doseLogId: dose.id,
          action,
          expectedLockVersion:
            forceStaleLockVersion !== undefined
              ? forceStaleLockVersion
              : dose.lockVersion,
          note,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { mutexMessage: string };
        error?: string;
      };

      if (res.status === 409 || !json.success) {
        const conflictMsg =
          json.error ||
          "This dose is already locked by another Care-Circle member.";
        setFeedbackBanner({
          type: "conflict",
          text: conflictMsg,
        });
        onDoseUpdated(conflictMsg);
      } else if (json.data) {
        setShowSkipReasons(false);
        setFeedbackBanner({
          type: "success",
          text: json.data.mutexMessage,
        });
        onDoseUpdated(json.data.mutexMessage);
      }
    } catch {
      setFeedbackBanner({
        type: "conflict",
        text: "Connection error while updating dose status.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.article
      layout
      whileHover={shouldReduceMotion ? {} : { y: -3, scaleX: 1.012, scaleY: 1.008 }}
      transition={{ type: "spring", stiffness: 360, damping: 18, mass: 0.7 }}
      className={`bento-card p-7 sm:p-8 flex flex-col justify-between ${
        isTaken
          ? "border-[#10B981] bg-gradient-to-b from-white to-emerald-50/40"
          : isSkipped
            ? "border-[#D97706] bg-gradient-to-b from-white to-amber-50/30"
            : "border-[#E2DDD5] bg-white"
      }`}
    >
      <div>
        {/* Top Row: Time Pill + Purpose Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-[#E2DDD5]">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#111827] text-white font-mono font-semibold text-lg">
            <Clock className="w-5 h-5 text-[#10B981]" />
            <span>{scheduledTimeStr}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E2DDD5] text-sm font-semibold text-slate-700">
              {dose.medication.drugClass}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200 text-[#2563EB] text-sm font-semibold">
              <Utensils className="w-4 h-4" />
              <span>{formatPlainFoodRule(dose.medication.foodRule)}</span>
            </span>
          </div>
        </div>

        {/* Center Row: Interactive 3D Procedural Pill-Box Twin + 26px Title & 22px Body */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-7">
          <Suspense
            fallback={
              <PillSvgTwin
                shape={dose.medication.pillShape}
                primaryColor={dose.medication.pillColorPrimary}
                secondaryColor={dose.medication.pillColorSecondary}
                imprint={dose.medication.pillImprint}
                size="lg"
              />
            }
          >
            <InteractivePill3D
              shape={dose.medication.pillShape}
              primaryColor={dose.medication.pillColorPrimary}
              secondaryColor={dose.medication.pillColorSecondary}
              imprint={dose.medication.pillImprint}
              medName={dose.medication.name}
              dosage={dose.medication.dosage}
              instructions={dose.medication.instructions}
              isConfirmed={isTaken}
              size="lg"
              reducedMotion={Boolean(shouldReduceMotion)}
              allowModalInspect={true}
            />
          </Suspense>

          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className="font-display text-[26px] sm:text-[28px] font-bold text-[#111827] tracking-tight">
                {dose.medication.name}
              </h3>
              <span className="px-3.5 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] font-mono text-[20px] font-bold">
                {dose.medication.dosage}
              </span>
            </div>

            <p className="text-[22px] leading-[1.5] text-[#111827] font-normal">
              {dose.medication.instructions}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence mode="wait">
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className={`mb-5 p-4 rounded-2xl border font-semibold text-[18px] ${
              feedbackBanner.type === "conflict"
                ? "bg-red-50 border-red-300 text-red-900"
                : "bg-emerald-50 border-[#10B981] text-[#0F766E]"
            }`}
          >
            {feedbackBanner.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Action Area: Morphing 64px+ Full-Width Emerald Confirmation or Secondary Actions */}
      <div className="space-y-4">
        {isTaken ? (
          <motion.div
            layout
            initial={shouldReduceMotion ? false : { scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full min-h-[64px] px-6 py-4 rounded-2xl bg-[#0F766E] text-white font-display font-semibold text-[20px] flex flex-wrap items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[3]" />
              </span>
              <span>
                Confirmed by {dose.loggedByName || "You"} at {loggedTimeStr}
              </span>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-black/20 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              LOCKED v{dose.lockVersion}
            </span>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Full-Width 64px "I Took This" Button */}
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? {} : { scaleX: 1.02, scaleY: 1.015 }}
              whileTap={shouldReduceMotion ? {} : { scaleX: 1.05, scaleY: 0.93 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
              disabled={submitting}
              onClick={() => submitDoseAction("TAKEN")}
              className="w-full min-h-[64px] min-w-[200px] px-7 py-4 rounded-2xl bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-display font-semibold text-[20px] flex items-center justify-center gap-3 shadow-sm transition-colors"
            >
              <Check className="w-6 h-6 stroke-[2.5]" />
              <span>I Took This</span>
            </motion.button>

            {/* Secondary Tactile Row (>= 64px height, >= 120px width, >= 16px spacing per RULE-UX-02) */}
            <div className="flex flex-wrap items-center gap-4">
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? {} : { scaleX: 1.02, scaleY: 1.015 }}
                whileTap={shouldReduceMotion ? {} : { scaleX: 1.05, scaleY: 0.93 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                disabled={submitting}
                onClick={() => submitDoseAction("SNOOZED")}
                className="flex-1 min-h-[64px] min-w-[150px] px-6 py-3.5 rounded-2xl bg-[#FAF8F5] hover:bg-slate-100 disabled:opacity-50 text-[#111827] font-display font-semibold text-[20px] flex items-center justify-center gap-2.5 border border-[#E2DDD5] transition-colors"
              >
                <Clock className="w-5 h-5 text-[#2563EB]" />
                <span>Snooze 15m</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? {} : { scaleX: 1.02, scaleY: 1.015 }}
                whileTap={shouldReduceMotion ? {} : { scaleX: 1.05, scaleY: 0.93 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                disabled={submitting}
                onClick={() => setShowSkipReasons((prev) => !prev)}
                className="flex-1 min-h-[64px] min-w-[180px] px-6 py-3.5 rounded-2xl bg-white hover:bg-amber-50/60 text-[#111827] font-display font-semibold text-[20px] flex items-center justify-center gap-2.5 border border-[#D97706] transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-[#D97706]" />
                <span>
                  {isSkipped
                    ? `Skipped (${dose.note || "Noted"})`
                    : "Skip / Feeling Off"}
                </span>
              </motion.button>
            </div>
          </div>
        )}

        {/* 1-Tap Skip Reason Picker */}
        <AnimatePresence>
          {showSkipReasons && !isTaken && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3"
            >
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#D97706]">
                <p className="text-[20px] font-semibold text-[#111827] mb-4">
                  Tap a reason so your Care-Circle and Dr. Vance know how you feel:
                </p>
                <div className="flex flex-wrap gap-4">
                  {SKIP_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        submitDoseAction("SKIPPED", `Skipped: ${reason}`)
                      }
                      className="min-h-[64px] min-w-[160px] px-5 py-3 rounded-xl bg-white hover:bg-amber-50 text-[#111827] font-semibold text-[20px] border border-[#E2DDD5] shadow-2xs"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
