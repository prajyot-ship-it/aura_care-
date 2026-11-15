"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  X,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Clock,
  Activity,
} from "lucide-react";
import {
  CLINICAL_MEDICATION_PRESETS,
  MedicationPreset,
  PolypharmacyEvaluationResult,
  evaluatePolypharmacyConflicts,
  ExistingMedicationSummary,
} from "@/lib/polypharmacyEngine";
import { PolypharmacyAlert } from "./PolypharmacyAlert";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";
import { FoodRule, MedFrequency, PillShape } from "@/lib/types";

const BASELINE_ACTIVE_MEDS: ExistingMedicationSummary[] = [
  {
    id: "med-lisinopril",
    name: "Lisinopril",
    genericName: "Lisinopril",
    drugClass: "ACE_INHIBITOR",
    dosage: "10 mg",
    scheduledTimes: ["08:00"],
    foodRule: "WITH_FOOD",
    status: "ACTIVE",
  },
  {
    id: "med-eliquis",
    name: "Eliquis",
    genericName: "Apixaban",
    drugClass: "ANTICOAGULANT",
    dosage: "5 mg",
    scheduledTimes: ["08:00", "20:00"],
    foodRule: "ANYTIME",
    status: "ACTIVE",
  },
  {
    id: "med-levothyroxine",
    name: "Levothyroxine",
    genericName: "Levothyroxine Sodium",
    drugClass: "THYROID_HORMONE",
    dosage: "75 mcg",
    scheduledTimes: ["06:30"],
    foodRule: "EMPTY_STOMACH",
    status: "ACTIVE",
  },
  {
    id: "med-atorvastatin",
    name: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    drugClass: "STATIN",
    dosage: "20 mg",
    scheduledTimes: ["21:00"],
    foodRule: "BEFORE_SLEEP",
    status: "ACTIVE",
  },
];

interface ScheduleModalProps {
  isOpen: boolean;
  requireElderApproval: boolean;
  elderName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const ACTIVE_CIRCADIAN_SLOTS = [
  { time: "06:30", hour: 6.5, label: "Levothyroxine 75 mcg", color: "#38BDF8" },
  { time: "08:00", hour: 8.0, label: "Lisinopril 10 mg + Eliquis 5 mg", color: "#0F766E" },
  { time: "20:00", hour: 20.0, label: "Eliquis 5 mg", color: "#F472B6" },
  { time: "21:00", hour: 21.0, label: "Atorvastatin 20 mg", color: "#64748B" },
];

function timeToHourDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 8;
  return h + m / 60;
}

export function ScheduleModal({
  isOpen,
  requireElderApproval,
  elderName,
  onClose,
  onSaved,
}: ScheduleModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [name, setName] = useState("Ibuprofen");
  const [genericName, setGenericName] = useState("Ibuprofen");
  const [drugClass, setDrugClass] = useState("NSAID");
  const [dosage, setDosage] = useState("400 mg");
  const [frequency, setFrequency] = useState<MedFrequency>("TWICE_DAILY");
  const [scheduledTimesText, setScheduledTimesText] = useState("08:00, 20:00");
  const [foodRule, setFoodRule] = useState<FoodRule>("WITH_FOOD");
  const [instructions, setInstructions] = useState(
    "Take with food or milk to reduce stomach upset."
  );
  const [pillShape, setPillShape] = useState<PillShape>("OVAL");
  const [pillColorPrimary, setPillColorPrimary] = useState("#EA580C");
  const [pillColorSecondary, setPillColorSecondary] = useState("#FDBA74");
  const [pillImprint, setPillImprint] = useState("IBU400");
  const [proposalReason, setProposalReason] = useState(
    "For temporary knee discomfort after physical therapy."
  );

  const [evaluation, setEvaluation] =
    useState<PolypharmacyEvaluationResult | null>(null);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parseTimes = useCallback((raw: string): string[] => {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{2}:\d{2}$/.test(s));
  }, []);

  const runLivePolypharmacyCheck = useCallback(async () => {
    if (!name.trim() || !dosage.trim()) return;
    const times = parseTimes(scheduledTimesText);
    const normalizedTimes = times.length > 0 ? times : ["08:00"];

    // 1. Instantaneous synchronous client-side evaluation (works offline & on static GitHub Pages)
    const localEval = evaluatePolypharmacyConflicts(
      {
        name,
        genericName: genericName || name,
        drugClass,
        dosage,
        scheduledTimes: normalizedTimes,
        foodRule,
      },
      BASELINE_ACTIVE_MEDS
    );
    setEvaluation(localEval);

    // 2. Also query server / fallback API in case additional dynamic meds were added
    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          name,
          genericName,
          drugClass,
          dosage,
          scheduledTimes: normalizedTimes,
          foodRule,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { evaluation?: PolypharmacyEvaluationResult };
      };
      if (json.success && json.data?.evaluation) {
        setEvaluation(json.data.evaluation);
      }
    } catch {
      // localEval is already set
    }
  }, [name, genericName, drugClass, dosage, scheduledTimesText, foodRule, parseTimes]);

  useEffect(() => {
    if (isOpen) {
      runLivePolypharmacyCheck();
    }
  }, [isOpen, runLivePolypharmacyCheck]);

  if (!isOpen || typeof document === "undefined") return null;

  const candidateTimes = parseTimes(scheduledTimesText);

  function applyPreset(preset: MedicationPreset) {
    setName(preset.name);
    setGenericName(preset.genericName);
    setDrugClass(preset.drugClass);
    setDosage(preset.dosage);
    setFrequency(preset.frequency);
    setScheduledTimesText(preset.scheduledTimes.join(", "));
    setFoodRule(preset.foodRule);
    setInstructions(preset.instructions);
    setPillShape(preset.pillShape);
    setPillColorPrimary(preset.pillColorPrimary);
    setPillColorSecondary(preset.pillColorSecondary);
    setPillImprint(preset.pillImprint);
    setOverrideConfirmed(false);
    setErrorMsg(null);
  }

  function handleApplyRecommendedTiming(
    recommendedTimes: string[],
    recommendedFoodRule?: FoodRule
  ) {
    setScheduledTimesText(recommendedTimes.join(", "));
    if (recommendedFoodRule) {
      setFoodRule(recommendedFoodRule);
    }
    setErrorMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const times = parseTimes(scheduledTimesText);
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: false,
          overrideConfirmed,
          name,
          genericName,
          drugClass,
          dosage,
          frequency,
          scheduledTimes: times.length > 0 ? times : ["08:00"],
          foodRule,
          instructions,
          pillShape,
          pillColorPrimary,
          pillColorSecondary,
          pillImprint,
          proposalReason,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: {
          stagedForElderApproval: boolean;
          medication?: { name: string; dosage: string };
          evaluation: PolypharmacyEvaluationResult;
        };
        error?: string;
      };

      if (!json.success) {
        if (json.data?.evaluation) {
          setEvaluation(json.data.evaluation);
        }
        setErrorMsg(json.error || "Could not save medication.");
        return;
      }

      const medLabel = `${name} ${dosage}`;
      if (json.data?.stagedForElderApproval) {
        onSaved(
          `Staged "${medLabel}" as PENDING_ELDER_APPROVAL for ${elderName}'s Dignity Co-Sign & dispatched notification email.`
        );
      } else {
        onSaved(
          `Added "${medLabel}" directly to active routine and generated today's dose windows.`
        );
      }
      onClose();
    } catch {
      setErrorMsg("Network error submitting medication.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Add or Propose Medication with Live Polypharmacy Guardrail"
      onClick={onClose}
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-[#E2DDD5] overflow-hidden my-6"
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#111827] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0F766E] text-white">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Add / Propose Medication • Live Polypharmacy &amp; Circadian Inspector
              </h2>
              <p className="text-xs text-slate-300">
                Two-column clinical safety workbench evaluating drug-drug contraindications and 4-hour GI absorption spacing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Workbench Layout */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 max-h-[84vh] overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-[#E2DDD5]"
        >
          {/* Left Column (7 Cols): Presets + Prescription Inputs */}
          <div className="lg:col-span-7 p-6 space-y-5">
            {/* 1-Click Clinical Scenario Presets */}
            <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E2DDD5]">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                1-Click Clinical Guardrail Test Scenarios:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CLINICAL_MEDICATION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      name === preset.name
                        ? "bg-[#111827] text-white border-[#111827] shadow-2xs"
                        : "bg-white hover:bg-slate-50 text-[#111827] border-[#E2DDD5]"
                    }`}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        name === preset.name
                          ? "text-[#10B981]"
                          : "text-slate-500"
                      }`}
                    >
                      {preset.badge}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand / Medication Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Ingredient (Generic)
                </label>
                <input
                  type="text"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Therapeutic Drug Class
                </label>
                <input
                  type="text"
                  value={drugClass}
                  onChange={(e) => setDrugClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dosage Strength *
                </label>
                <input
                  type="text"
                  required
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Times (HH:mm) *
                </label>
                <input
                  type="text"
                  required
                  value={scheduledTimesText}
                  onChange={(e) => setScheduledTimesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Food &amp; Stomach Rule
                </label>
                <select
                  value={foodRule}
                  onChange={(e) => setFoodRule(e.target.value as FoodRule)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm font-semibold"
                >
                  <option value="WITH_FOOD">WITH_FOOD (With Meal)</option>
                  <option value="EMPTY_STOMACH">EMPTY_STOMACH (Before Meal)</option>
                  <option value="BEFORE_SLEEP">BEFORE_SLEEP (Bedtime)</option>
                  <option value="ANYTIME">ANYTIME</option>
                </select>
              </div>
            </div>

            {/* 3D Pill Twin Customizer */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col sm:flex-row items-center gap-5">
              <PillSvgTwin
                shape={pillShape}
                primaryColor={pillColorPrimary}
                secondaryColor={pillColorSecondary}
                imprint={pillImprint}
                size="md"
              />

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pill Shape
                  </label>
                  <select
                    value={pillShape}
                    onChange={(e) => setPillShape(e.target.value as PillShape)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2DDD5] text-xs font-semibold bg-white"
                  >
                    <option value="OVAL">OVAL</option>
                    <option value="ROUND">ROUND</option>
                    <option value="CAPSULE">CAPSULE</option>
                    <option value="DIAMOND">DIAMOND</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Imprint Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pillImprint}
                    onChange={(e) =>
                      setPillImprint(e.target.value.toUpperCase())
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2DDD5] text-xs font-mono font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={pillColorPrimary}
                    onChange={(e) => setPillColorPrimary(e.target.value)}
                    className="w-full h-8 rounded-lg border border-[#E2DDD5] cursor-pointer bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={pillColorSecondary}
                    onChange={(e) => setPillColorSecondary(e.target.value)}
                    className="w-full h-8 rounded-lg border border-[#E2DDD5] cursor-pointer bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plain-English Instructions for {elderName}
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Proposal (Elder Consent Card)
                </label>
                <input
                  type="text"
                  value={proposalReason}
                  onChange={(e) => setProposalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols): Live Clinical Safety & Circadian Spacing Visualizer */}
          <div className="lg:col-span-5 p-6 bg-[#F8F7F4] flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <h3 className="font-display text-sm font-bold text-[#111827] uppercase tracking-wider">
                    Clinical Safety &amp; Circadian Visualizer
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  LIVE ENGINE
                </span>
              </div>

              {/* 24-Hour Circadian Spacing Timeline Bar */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2DDD5] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    24-Hour Circadian Spacing Map
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    06:00 — 22:00
                  </span>
                </div>

                <div className="relative h-12 rounded-xl bg-[#FAF8F5] border border-[#E2DDD5] px-2 flex items-center">
                  {/* 4h Levothyroxine Chelation Zone Indicator (06:30 to 10:30) */}
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-amber-200/40 border border-dashed border-amber-400"
                    style={{
                      left: `${(6.5 / 24) * 100}%`,
                      width: `${(4 / 24) * 100}%`,
                    }}
                    title="Levothyroxine 4-Hour GI Absorption Buffer (06:30–10:30)"
                  />

                  {/* Existing Active Medication Pins */}
                  {ACTIVE_CIRCADIAN_SLOTS.map((slot) => (
                    <div
                      key={slot.time}
                      style={{ left: `${(slot.hour / 24) * 100}%` }}
                      className="absolute -translate-x-1/2 flex flex-col items-center group"
                      title={`Active: ${slot.label} @ ${slot.time}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: slot.color }}
                      />
                      <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                        {slot.time}
                      </span>
                    </div>
                  ))}

                  {/* Candidate Medication Pin(s) */}
                  {candidateTimes.map((t) => {
                    const hr = timeToHourDecimal(t);
                    return (
                      <div
                        key={t}
                        style={{ left: `${(hr / 24) * 100}%` }}
                        className="absolute -translate-x-1/2 -top-1 flex flex-col items-center z-10"
                        title={`Candidate: ${name} @ ${t}`}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-[#111827] text-white font-mono text-[9px] font-bold shadow-xs">
                          +{t}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-300/70 border border-amber-500" />
                    06:30–10:30 Thyroid 4h Buffer
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#111827]" />
                    Candidate Slot ({candidateTimes.join(", ") || "08:00"})
                  </span>
                </div>
              </div>

              {/* Polypharmacy Evaluation Output */}
              {evaluation && evaluation.hasConflicts ? (
                <PolypharmacyAlert
                  conflicts={evaluation.conflicts}
                  overrideConfirmed={overrideConfirmed}
                  onToggleOverride={setOverrideConfirmed}
                  onApplyRecommendedTiming={handleApplyRecommendedTiming}
                />
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/90 border border-[#10B981] text-[#0F766E] flex items-start gap-3 text-xs font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">
                      All Polypharmacy &amp; Spacing Checks Passed
                    </div>
                    <p className="mt-0.5 text-emerald-900/80">
                      No drug-drug contraindications, duplicate classes, or 4-hour absorption overlaps detected with {elderName}’s active regimen.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dignity Protocol Notice + Submit Actions */}
            <div className="space-y-3 pt-4 border-t border-[#E2DDD5]">
              <div className="p-3 rounded-xl bg-white border border-[#E2DDD5] text-xs text-slate-700 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  {requireElderApproval ? (
                    <>
                      <strong>Dignity Co-Sign Active:</strong> Stages as{" "}
                      <code className="font-mono font-bold text-[#2563EB]">
                        PENDING_ELDER_APPROVAL
                      </code>{" "}
                      for {elderName}’s approval.
                    </>
                  ) : (
                    <>
                      <strong>Direct Delegation Active:</strong> Activates immediately on {elderName}’s schedule.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full border border-[#E2DDD5] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm"
                >
                  {submitting
                    ? "Validating & Saving..."
                    : requireElderApproval
                      ? `Submit Proposal for ${elderName}'s Approval`
                      : "Add Medication to Active Schedule"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
